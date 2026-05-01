"""
Remote Command Allowlist — blocks dangerous shell/code injection patterns.

Every command submitted via the remote API is validated here before
being enqueued for execution. This is a defence-in-depth layer:
even if the intent engine somehow parses a dangerous command,
this filter will reject it.
"""

import re

# Patterns that should NEVER be accepted from remote clients
_DANGER_PATTERNS = [
    r"\bimport\s+os\b",
    r"\bimport\s+subprocess\b",
    r"\bimport\s+sys\b",
    r"\bexec\s*\(",
    r"\beval\s*\(",
    r"\b__import__\s*\(",
    r"\brm\s+-rf\b",
    r"\bdel\s+/[sS]\b",
    r"\bformat\s+[a-zA-Z]:\b",
    r"\bshutdown\s+/[sS]\b",
    r"\bos\.system\b",
    r"\bsubprocess\.\b",
]

_compiled = [re.compile(p, re.IGNORECASE) for p in _DANGER_PATTERNS]


def validate_command(text: str) -> tuple[bool, str]:
    """
    Check if a remote command is safe to execute.

    Returns:
        (True, "")           if the command is allowed
        (False, reason_str)  if the command is blocked
    """
    if not text or not text.strip():
        return False, "Empty command"

    for pattern in _compiled:
        if pattern.search(text):
            return False, f"Command blocked: contains dangerous pattern"

    # Length sanity — extremely long commands are suspicious
    if len(text) > 500:
        return False, "Command too long (max 500 chars)"

    return True, ""
