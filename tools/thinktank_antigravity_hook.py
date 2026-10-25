#!/usr/bin/env python3
"""Minimal Antigravity hook bridge for Think Tank session context and tool metadata."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
import urllib.error
import urllib.request
from typing import Any


API_URL = "http://127.0.0.1:8780/api/telemetry/host_tool"
MAX_INPUT_BYTES = 2_000_000
TOOLS_DIR = str(Path(__file__).resolve().parent)
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

try:
    import bridge_transport
except ImportError:
    bridge_transport = None


def _conversation_id(payload: dict[str, Any]) -> str | None:
    value = payload.get("conversationId")
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not value or len(value) > 200 or not re.fullmatch(r"[A-Za-z0-9-]+", value):
        return None
    return value


def build_tool_event(payload: dict[str, Any]) -> dict[str, Any] | None:
    conversation_id = _conversation_id(payload)
    tool_call = payload.get("toolCall")
    if not conversation_id or not isinstance(tool_call, dict):
        return None
    raw_name = tool_call.get("name")
    if not isinstance(raw_name, str) or not raw_name.strip():
        return None
    name = re.sub(r"[^A-Za-z0-9_.:/ -]", "", raw_name.strip())[:120]
    if not name:
        return None
    step = payload.get("stepIdx")
    if not isinstance(step, int) or isinstance(step, bool) or step < 0:
        return None
    error = payload.get("error")
    tool_args = tool_call.get("args") or payload.get("args")
    tool_output = payload.get("output") or payload.get("result")
    agent_id = payload.get("agentId") or payload.get("senderCode") or "antigravity"
    agent_name = payload.get("agentName") or payload.get("senderName") or "Antigravity"
    return {
        "convId": conversation_id,
        "id": f"antigravity-tool-{conversation_id}-{step}",
        "tool": name,
        "status": "ERROR" if isinstance(error, str) and error else "SUCCESS",
        "stepIdx": step,
        "args": tool_args if isinstance(tool_args, dict) else {},
        "output": str(tool_output)[:500] if tool_output else "",
        "error": str(error)[:500] if error else "",
        "agentId": agent_id,
        "agentName": agent_name,
    }


def build_response(event_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    if event_name == "pre-invocation":
        conversation_id = _conversation_id(payload)
        if not conversation_id:
            return {}
        message = (
            "When using the Think Tank bridge in this session, include this exact value with --conv-id on every command."
        )
        return {"injectSteps": [{"ephemeralMessage": message}]}
    return {}


def send_tool_event(event: dict[str, Any]) -> None:
    if bridge_transport is not None:
        try:
            bridge_transport.api_post_fast(
                "telemetry/host_tool",
                event,
                event_id=event["id"],
                timeout=0.35,
            )
            return
        except Exception:
            # Keep the direct path as a last-resort compatibility fallback.
            pass

    body = json.dumps(event, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-ThinkTank-Event-Id": event["id"],
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=0.4) as response:
            response.read(256)
    except (OSError, urllib.error.URLError, TimeoutError):
        return


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    event_name = args[0] if args else ""
    try:
        raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
        if len(raw) > MAX_INPUT_BYTES:
            payload: dict[str, Any] = {}
        else:
            payload = json.loads(raw.decode("utf-8")) if raw else {}
        if not isinstance(payload, dict):
            payload = {}
    except (UnicodeError, json.JSONDecodeError):
        payload = {}

    if event_name == "post-tool-use":
        event = build_tool_event(payload)
        if event:
            send_tool_event(event)
        response = {}
    else:
        response = build_response(event_name, payload)
    sys.stdout.write(json.dumps(response, ensure_ascii=False))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
