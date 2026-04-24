import sys
import os
import threading
import uuid
import asyncio
from typing import Optional
from pathlib import Path
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import time
import core.runtime as runtime
from remote.job_store import get_job_store, JobEvent
from remote.db import save_job
from remote.auth import generate_pairing_code, verify_pairing_code, create_access_token, verify_access_token
from remote.security import log_audit_event
from remote.allowlist import validate_command

app = FastAPI(title="ARC Remote Daemon")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandIn(BaseModel):
    text: str
    source: str = "remote"

class ReplyIn(BaseModel):
    answer: str

class PairIn(BaseModel):
    code: str
    device_name: str

def get_current_device(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload.get("device", "unknown")

@app.on_event("startup")
def _startup():
    print("✨ ARC Server Starting...")
    generate_pairing_code()
    def _boot():
        runtime.boot(voice=False)
    threading.Thread(target=_boot, daemon=True).start()

@app.post("/pair")
def pair_device(body: PairIn):
    if verify_pairing_code(body.code):
        token = create_access_token(body.device_name)
        return {"token": token}
    raise HTTPException(status_code=401, detail="Invalid or expired code")

@app.get("/pairing-code")
def get_code():
    # Only for testing/local UI. Real setup would display on desktop screen.
    return {"code": generate_pairing_code()}

@app.get("/health")
def health_check():
    """
    Returns the server health and runtime boot status.
    """
    booted = getattr(runtime, "_booted", False)
    return {"status": "ok", "booted": booted}

import queue

_command_queue = queue.Queue()

def _command_worker():
    while True:
        job_id, body_text, body_source, device = _command_queue.get()
        job = get_job_store().get(job_id)
        if not job:
            _command_queue.task_done()
            continue
            
        try:
            res = runtime.execute_text_command(
                text=body_text,
                source=body_source,
                session_id=job_id,
                user=device
            )
            if res.status == "completed":
                job.add_event(JobEvent("result", res.final_result or "Completed", data=res.to_dict()))
            else:
                job.add_event(JobEvent("error", res.final_result or "Failed", data=res.to_dict()))
        except Exception as e:
            job.add_event(JobEvent("error", str(e)))
        finally:
            _command_queue.task_done()

# Start the persistent worker thread
threading.Thread(target=_command_worker, daemon=True, name="CommandWorkerThread").start()

@app.post("/command")
def run_command(body: CommandIn, device: str = Depends(get_current_device)):
    """
    Submit a command. Returns a job_id immediately.
    """
    if not runtime._booted:
        raise HTTPException(status_code=503, detail="Runtime booting.")

    # Security: validate command against allowlist
    allowed, reason = validate_command(body.text)
    if not allowed:
        log_audit_event("blocked", device, "blocked_command", f"{body.text} — {reason}")
        raise HTTPException(status_code=400, detail=reason)

    job_id = str(uuid.uuid4())
    job = get_job_store().get_or_create(job_id)
    save_job(job_id, command=body.text, source=body.source, user=device, status="created", created_at=time.time())
    
    # Audit log
    log_audit_event(job_id, device, "command", body.text)
    
    job.add_event(JobEvent("ack", f"Command received: {body.text}"))

    # Enqueue for execution on the persistent worker thread
    _command_queue.put((job_id, body.text, body.source, device))
    
    return {"job_id": job_id}

@app.post("/reply/{job_id}")
def reply_job(job_id: str, body: ReplyIn, device: str = Depends(get_current_device)):
    """
    Answer a clarify/confirm event for a running job.
    """
    job = get_job_store().get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.set_reply(body.answer)
    return {"status": "ok"}

@app.get("/jobs/health_check_ping")
def health_ping(device: str = Depends(get_current_device)):
    """
    Authenticated ping for the mobile app to verify token validity
    without triggering any intent routing side effects.
    """
    return {"status": "ok", "timestamp": time.time()}

@app.get("/jobs/{job_id}")
def get_job_status(job_id: str, device: str = Depends(get_current_device)):
    """
    Poll for job status and events (alternative to WebSocket).
    """
    job = get_job_store().get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": job_id,
        "events": [e.to_dict() for e in job.events]
    }

@app.websocket("/stream/{job_id}")
async def stream_job(websocket: WebSocket, job_id: str):
    """
    Stream events for a job via WebSocket.
    Events: ack -> clarify/confirm -> executing -> verify -> result
    """
    await websocket.accept()
    job = get_job_store().get(job_id)
    if not job:
        await websocket.close(code=1008)
        return

    sent_idx = 0
    try:
        while True:
            current_len = len(job.events)
            if current_len > sent_idx:
                for i in range(sent_idx, current_len):
                    event = job.events[i]
                    await websocket.send_json(event.to_dict())
                    if event.type in ("result", "error"):
                        await websocket.close()
                        return
                sent_idx = current_len
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass

# ── Static file serving (production) ─────────────────────────
# Serve the built mobileapp UI from FastAPI so everything runs on one port.
# In development, use Vite dev server (port 5173) with proxy instead.
_static_dir = Path(__file__).resolve().parent.parent / "mobileapp" / "dist"
if _static_dir.is_dir():
    from starlette.responses import FileResponse

    @app.get("/")
    def serve_index():
        return FileResponse(str(_static_dir / "index.html"))

    # Mount static assets (JS, CSS, etc.) — must be AFTER all API routes
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
    print(f"  Serving UI from {_static_dir}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
