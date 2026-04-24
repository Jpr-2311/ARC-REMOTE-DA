/**
 * ARC Controller — WebSocket Manager
 * Manages WebSocket connections for real-time job event streaming.
 * Falls back to HTTP polling if WebSocket fails.
 */

import CONFIG from '../utils/config.js';
import appState from '../state/appState.js';

/**
 * Poll job events via HTTP as a fallback.
 */
function startHttpPolling(jobId, callbacks, intervalMs = 2000) {
  const { onEvent, onClose } = callbacks;
  let lastEventCount = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const headers = {};
      if (appState.token) {
        headers['Authorization'] = `Bearer ${appState.token}`;
      }
      const res = await fetch(`${CONFIG.API_BASE}/jobs/${jobId}`, { headers });
      if (!res.ok) {
        if (res.status === 404) {
          stopped = true;
          onClose?.({ clean: true });
          return;
        }
        return; // Retry next interval
      }
      const data = await res.json();
      const events = data.events || [];

      // Emit only new events
      for (let i = lastEventCount; i < events.length; i++) {
        onEvent?.(events[i]);
        if (events[i].type === 'result' || events[i].type === 'error') {
          stopped = true;
          onClose?.({ clean: true });
          return;
        }
      }
      lastEventCount = events.length;
    } catch (err) {
      console.warn('HTTP poll error:', err);
    }

    if (!stopped) {
      setTimeout(poll, intervalMs);
    }
  };

  poll();

  return {
    close() { stopped = true; },
    isConnected() { return !stopped; },
  };
}

/**
 * Connect to a job's event stream via WebSocket.
 * @param {string} jobId - The job ID to stream events for
 * @param {object} callbacks - { onEvent, onError, onClose, onOpen }
 * @returns {{ close: Function, isConnected: Function }}
 */
export function connectToJob(jobId, callbacks = {}) {
  const { onEvent, onError, onClose, onOpen } = callbacks;

  let ws = null;
  let reconnectAttempts = 0;
  let closed = false;
  let connected = false;
  let pollingFallback = null;

  function connect() {
    if (closed) return;

    const url = `${CONFIG.WS_BASE}${CONFIG.ENDPOINTS.STREAM}/${jobId}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      connected = true;
      reconnectAttempts = 0;
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent?.(data);

        // Terminal events — server will close, but we mark our side too
        if (data.type === 'result' || data.type === 'error') {
          closed = true;
          connected = false;
        }
      } catch (err) {
        onError?.(new Error(`Failed to parse event: ${err.message}`));
      }
    };

    ws.onerror = (event) => {
      onError?.(new Error('WebSocket connection error'));
    };

    ws.onclose = (event) => {
      connected = false;

      if (closed) {
        onClose?.({ clean: true });
        return;
      }

      // Attempt reconnect
      if (reconnectAttempts < CONFIG.WS_MAX_RECONNECTS) {
        reconnectAttempts++;
        const delay = CONFIG.WS_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
        setTimeout(connect, delay);
      } else {
        // Fall back to HTTP polling
        console.warn(`WS failed after ${CONFIG.WS_MAX_RECONNECTS} attempts — switching to HTTP polling`);
        pollingFallback = startHttpPolling(jobId, { onEvent, onClose });
      }
    };
  }

  connect();

  return {
    close() {
      closed = true;
      connected = false;
      if (pollingFallback) pollingFallback.close();
      if (ws && ws.readyState <= WebSocket.OPEN) {
        ws.close();
      }
    },
    isConnected() {
      return connected || (pollingFallback?.isConnected() ?? false);
    },
  };
}

