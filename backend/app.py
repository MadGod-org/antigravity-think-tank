import os
import sys
import json
import asyncio
import re
import time
import uuid
from contextlib import asynccontextmanager, suppress
from contextvars import ContextVar
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from bridge import execute_subagent_command
from bridge_transport import flush_outbox_fast
from sync_store import SyncEventStore
from outbox_recovery import outbox_recovery_loop
from governance import (
    DEFAULT_ROLE_CAPS,
    evaluate_review,
    normalize_role_caps,
    normalize_round_limit,
    role_bucket,
    role_usage,
)

STATE_FILE = os.environ.get(
    "THINKTANK_STATE_FILE",
    os.path.join(os.path.expanduser("~"), ".gemini", "config", "think_tank_live_state.json"),
)
SYNC_DB_FILE = os.environ.get(
    "THINKTANK_SYNC_DB", os.path.join(os.path.dirname(STATE_FILE), "think_tank_sync.sqlite3")
)
sync_store = SyncEventStore(os.environ.get("THINKTANK_SYNC_DB", SYNC_DB_FILE))
request_event_id: ContextVar[Optional[str]] = ContextVar("thinktank_event_id", default=None)
request_project_id: ContextVar[Optional[str]] = ContextVar("thinktank_project_id", default=None)

@asynccontextmanager
async def lifespan(_app):
    recovery_task = asyncio.create_task(outbox_recovery_loop(flush_outbox_fast))
    try:
        yield
    finally:
        recovery_task.cancel()
        with suppress(asyncio.CancelledError):
            await recovery_task


app = FastAPI(title="Think Tank Matrix - Interactive Engine", version="3.6.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8780", "http://127.0.0.1:8780"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def idempotency_event_id(request, call_next):
    supplied = request.headers.get("x-thinktank-event-id", "").strip()
    raw_project_id = request.headers.get("x-thinktank-project-id") or request.query_params.get("projectId")
    project_id = raw_project_id.strip() if isinstance(raw_project_id, str) else None
    if project_id and (len(project_id) > 200 or not re.fullmatch(r"[A-Za-z0-9._:-]+", project_id)):
        return JSONResponse({"status": "error", "detail": "Invalid project ID."}, status_code=400)

    body_conv_id = None
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and "application/json" in request.headers.get("content-type", "").lower():
        try:
            body = json.loads(await request.body())
            if isinstance(body, dict) and isinstance(body.get("convId"), str):
                body_conv_id = body["convId"].strip() or None
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass  # Let FastAPI return its usual validation response for malformed JSON.

    query_conv_id = request.query_params.get("convId")
    if query_conv_id and body_conv_id and query_conv_id != body_conv_id:
        return JSONResponse({"status": "error", "detail": "Conversation IDs in the URL and request body do not match."}, status_code=400)
    conv_id = query_conv_id or body_conv_id
    conv = conversations_store.get(conv_id) if conv_id else None
    owner = conv.get("projectId") if conv else None

    if project_id and owner and owner != project_id:
        return JSONResponse({"status": "error", "detail": "This session belongs to a different project."}, status_code=403)

    if project_id and conv_id:
        conv = get_or_create_conversation(conv_id)
        owner = conv.get("projectId")
        if owner and owner != project_id:
            return JSONResponse({"status": "error", "detail": "This session belongs to a different project."}, status_code=403)
        if not owner:
            conv["projectId"] = project_id
            sync_store.commit(
                conversation_id=conv_id,
                event_id=f"project-scope-{uuid.uuid4()}",
                event_type="PROJECT_SCOPE_ASSIGNED",
                payload={"convId": conv_id, "projectId": project_id},
                snapshot=conv,
                source="project-scope",
            )
            save_persisted_state()

    event_token = request_event_id.set(supplied[:200] or None)
    project_token = request_project_id.set(project_id)
    try:
        if supplied:
            previous = sync_store.find_event_id(supplied[:200])
            if previous:
                if not conv_id or previous["conversation_id"] != conv_id:
                    return JSONResponse({"status": "error", "detail": "Idempotency key is already assigned to a different conversation."}, status_code=409)
                return JSONResponse({
                    "status": "duplicate",
                    "eventId": supplied[:200],
                    "convId": previous["conversation_id"],
                    "seq": previous["seq"],
                })
        return await call_next(request)
    finally:
        request_event_id.reset(event_token)
        request_project_id.reset(project_token)

# Persistent State Definition
default_think_tank_state = {
    "status": "DISCONNECTED",
    "project": "",
    "phase": "در انتظار دادهٔ زنده",
    "round": 0,
    "maxRounds": 50,
    "roleCaps": dict(DEFAULT_ROLE_CAPS),
    "roundStatus": "UNKNOWN",
    "progress": 0,
    "directive": "",
    "vpsStatus": "UNKNOWN",
}

default_proposal = None
default_review = None

# 10 Full Fleet Subagents
default_agents_state = []
"""Historical sample agent rows were removed from runtime defaults; only bridge updates are live data."""
default_messages_store = []
default_telemetry_store = {
    "toolCalls": [],
    "terminalLogs": [],
    "backgroundTasks": []
}

default_collaborations_store = []

# Multi-Conversation Store
conversations_store: Dict[str, Dict[str, Any]] = {}
active_conv_id = "default"

def get_or_create_conversation(conv_id: Optional[str]) -> Dict[str, Any]:
    global conversations_store
    cid = (conv_id or active_conv_id or "default").strip()
    if cid not in conversations_store:
        conversations_store[cid] = {
            "id": cid,
            "thinkTank": dict(default_think_tank_state),
            "proposal": None,
            "review": None,
            "agents": [],
            "messages": [],
            "telemetry": {"toolCalls": [], "terminalLogs": [], "backgroundTasks": []},
            "collaborations": [],
            "subtasks": [],
        }
    return conversations_store[cid]


def project_matches(conv: Dict[str, Any], project_id: Optional[str]) -> bool:
    owner = conv.get("projectId")
    if project_id:
        return owner == project_id
    return True


def normalize_agent_id(raw_id: Optional[str]) -> str:
    if not raw_id or not isinstance(raw_id, str):
        return ""
    clean = raw_id.replace("agent-", "").replace("agent_", "").lower().strip()
    m = re.match(r"^sub(?:agent)?[_-]?(\d+)$", clean)
    if m:
        return f"subagent_{m.group(1)}"
    return clean


def normalize_conversation(cid: str, conv: Dict[str, Any]) -> bool:
    """Fill governance defaults and deduplicate agents without rewriting existing messages or telemetry."""
    changed = False
    tt = conv.setdefault("thinkTank", dict(default_think_tank_state))
    if "roleCaps" not in tt:
        tt["roleCaps"] = dict(DEFAULT_ROLE_CAPS)
        tt["maxRounds"] = 50
        changed = True
    else:
        normalized = normalize_role_caps(tt.get("roleCaps"))
        if tt.get("roleCaps") != normalized:
            tt["roleCaps"] = normalized
            changed = True
        normalized_rounds = normalize_round_limit(tt.get("maxRounds", 50))
        if tt.get("maxRounds") != normalized_rounds:
            tt["maxRounds"] = normalized_rounds
            changed = True
    if "review" not in conv:
        conv["review"] = default_review
        changed = True
    conv.setdefault("messages", [])
    conv.setdefault("telemetry", {"toolCalls": [], "terminalLogs": [], "backgroundTasks": []})
    conv.setdefault("collaborations", [])
    conv.setdefault("subtasks", [])
    conv.setdefault("proposal", None)

    # Deduplicate and canonicalize dynamic subagent fleet
    raw_agents = conv.setdefault("agents", [])
    merged_agents: Dict[str, Dict[str, Any]] = {}
    for ag in raw_agents:
        if not isinstance(ag, dict):
            continue
        canon_id = normalize_agent_id(ag.get("id", "")) or normalize_agent_id(ag.get("code", ""))
        if not canon_id or canon_id in {"operator", "user"}:
            continue
        if canon_id not in merged_agents:
            merged_agents[canon_id] = {**ag, "id": canon_id}
            if "collaboratingWith" in merged_agents[canon_id]:
                merged_agents[canon_id]["collaboratingWith"] = [
                    normalize_agent_id(c) for c in merged_agents[canon_id]["collaboratingWith"] if normalize_agent_id(c) and normalize_agent_id(c) != canon_id
                ]
        else:
            target = merged_agents[canon_id]
            for k, v in ag.items():
                if v is not None:
                    if k == "collaboratingWith" and isinstance(v, list):
                        existing_cw = target.setdefault("collaboratingWith", [])
                        for item in v:
                            clean_item = normalize_agent_id(item)
                            if clean_item and clean_item != canon_id and clean_item not in existing_cw:
                                existing_cw.append(clean_item)
                    elif k in {"tool", "activeTool", "thought", "status", "name", "role", "code", "icon", "task", "currentTask"} and v:
                        if k == "name" and target.get("name") and not target.get("name", "").startswith("sub"):
                            continue
                        target[k] = v
    if len(merged_agents) != len(raw_agents):
        conv["agents"] = list(merged_agents.values())
        changed = True

    return changed

def load_persisted_state():
    global conversations_store, active_conv_id
    durable = sync_store.load_conversations()
    if durable:
        conversations_store = {cid: row["snapshot"] for cid, row in durable.items()}
        for cid, snapshot in conversations_store.items():
            if normalize_conversation(cid, snapshot):
                sync_store.commit(
                    conversation_id=cid,
                    event_id=f"thinktank-governance-migration-{uuid.uuid4()}",
                    event_type="GOVERNANCE_DEFAULTS_MIGRATED",
                    payload={"roleCapsDefault": 50, "roundCapDefault": 50},
                    snapshot=snapshot,
                    source="migration",
                )
        if active_conv_id not in conversations_store:
            active_conv_id = next(iter(conversations_store), "default")
        active = get_or_create_conversation(active_conv_id)
        return active["thinkTank"], active["proposal"], active["agents"], active["messages"], active["telemetry"], active["collaborations"]

    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                active_conv_id = data.get("activeConversationId", "default")
                loaded_convs = data.get("conversations", {})
                if loaded_convs:
                    conversations_store = loaded_convs
                
                # Also load root fallback into active conversation
                conv = get_or_create_conversation(active_conv_id)
                if "thinkTank" in data:
                    conv["thinkTank"].update(data["thinkTank"])
                    if "roleCaps" not in data["thinkTank"]:
                        conv["thinkTank"]["roleCaps"] = dict(DEFAULT_ROLE_CAPS)
                        conv["thinkTank"]["maxRounds"] = 50
                if "proposal" in data:
                    conv["proposal"] = data["proposal"]
                if "agents" in data:
                    conv["agents"] = data["agents"]
                if "messages" in data:
                    conv["messages"] = data["messages"]
                if "telemetry" in data:
                    conv["telemetry"] = data["telemetry"]
                if "collaborations" in data:
                    conv["collaborations"] = data["collaborations"]

                for cid, snapshot in conversations_store.items():
                    normalize_conversation(cid, snapshot)
                    sync_store.commit(
                        conversation_id=cid,
                        event_id=f"legacy-import-{cid}",
                        event_type="SNAPSHOT_IMPORTED",
                        payload={"source": "legacy-state"},
                        snapshot=snapshot,
                        source="migration",
                    )
                return (
                    conv["thinkTank"],
                    conv["proposal"],
                    conv["agents"],
                    conv["messages"],
                    conv["telemetry"],
                    conv["collaborations"]
                )
        except Exception as e:
            print(f"[State] Error loading {STATE_FILE}: {e}")
            
    conv = get_or_create_conversation(active_conv_id)
    return conv["thinkTank"], conv["proposal"], conv["agents"], conv["messages"], conv["telemetry"], conv["collaborations"]

def save_persisted_state():
    try:
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        active_conv = get_or_create_conversation(active_conv_id)
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "activeConversationId": active_conv_id,
                "conversations": conversations_store,
                "thinkTank": active_conv["thinkTank"],
                "proposal": active_conv["proposal"],
                "agents": active_conv["agents"],
                "messages": active_conv["messages"],
                "telemetry": active_conv["telemetry"],
                "collaborations": active_conv.get("collaborations", default_collaborations_store),
                "updatedAt": time.time()
            }, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[State] Error saving {STATE_FILE}: {e}")

think_tank_state, current_proposal, agents_state, messages_store, telemetry_store, collaborations_store = load_persisted_state()

def check_and_reload_state(conv_id: Optional[str] = None):
    # SQLite is the event/snapshot source of truth. File mtime polling could
    # replace newer in-memory state with an old external write and has been removed.
    return None


def require_conversation_id(conv_id: Optional[str]) -> str:
    cid = (conv_id or "").strip()
    if not cid or cid == "default":
        raise HTTPException(
            status_code=400,
            detail="An explicit Antigravity conversation ID is required for writes.",
        )
    if not project_matches(conversations_store.get(cid, {}), request_project_id.get()):
        raise HTTPException(status_code=403, detail="This session is not assigned to the active project.")
    return cid


class ConnectionManager:
    SEND_TIMEOUT_SECONDS = 1.0

    def __init__(self):
        self.active_connections: Dict[WebSocket, str] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, conv_id: str, generation: Optional[str], after_seq: Optional[int]):
        await websocket.accept()
        async with self.lock:
            self.active_connections[websocket] = conv_id
            conv = get_or_create_conversation(conv_id)
            cursor = sync_store.cursor(conv_id)
            try:
                await self._send(websocket, {"type": "SYNC_READY", "convId": conv_id, **cursor})
                if generation is not None and after_seq is not None:
                    result = sync_store.replay(conv_id, generation, after_seq)
                    if result["status"] == "replay":
                        await self._send(websocket, {
                            "type": "SYNC_REPLAY",
                            "convId": conv_id,
                            "generation": result["generation"],
                            "seq": result["seq"],
                            "events": [self._event_to_wire(event) for event in result["events"]],
                        })
                        return
                snapshot = sync_store.snapshot(conv_id) or conv
                await self._send(websocket, {
                    "type": "SYNC_SNAPSHOT",
                    "convId": conv_id,
                    "generation": cursor["generation"],
                    "seq": cursor["seq"],
                    "updatedAt": cursor["updated_at"],
                    "snapshot": snapshot,
                })
            except Exception:
                self.disconnect(websocket)
                try:
                    await websocket.close()
                except Exception:
                    pass
                raise

    async def _send(self, websocket: WebSocket, message: dict) -> None:
        await asyncio.wait_for(websocket.send_json(message), timeout=self.SEND_TIMEOUT_SECONDS)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)

    @staticmethod
    def _event_to_wire(event: dict) -> dict:
        payload = dict(event["payload"])
        payload.update({
            "convId": event["conversation_id"],
            "generation": event["generation"],
            "seq": event["seq"],
            "eventId": event["event_id"],
        })
        return payload

    async def broadcast(self, data: dict):
        conv_id = data.get("convId")
        if not conv_id:
            return
        conv = get_or_create_conversation(conv_id)
        event_id = request_event_id.get() or data.get("eventId") or str(uuid.uuid4())
        event_type = data.get("type", "STATE_UPDATE")
        async with self.lock:
            # Serialize durable commit with subscribe + snapshot/replay setup.
            # Otherwise a commit can land after the cursor is read but before
            # its snapshot is sent, producing a snapshot whose cursor lags it.
            envelope = sync_store.commit(
                conversation_id=conv_id,
                event_id=event_id,
                event_type=event_type,
                payload=data,
                snapshot=conv,
                source="api",
            )
            if envelope["duplicate"]:
                return
            message = self._event_to_wire(envelope)
            for connection, subscribed_conv in list(self.active_connections.items()):
                if subscribed_conv != conv_id:
                    continue
                try:
                    await self._send(connection, message)
                except Exception:
                    self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    conv_id = websocket.query_params.get("convId") or active_conv_id or "default"
    project_id = websocket.query_params.get("projectId")
    if project_id and (len(project_id) > 200 or not re.fullmatch(r"[A-Za-z0-9._:-]+", project_id)):
        await websocket.close(code=1008, reason="Invalid project ID")
        return
    conv = get_or_create_conversation(conv_id)
    owner = conv.get("projectId")
    if project_id and not owner:
        conv["projectId"] = project_id
        sync_store.commit(
            conversation_id=conv_id,
            event_id=f"project-scope-{uuid.uuid4()}",
            event_type="PROJECT_SCOPE_ASSIGNED",
            payload={"convId": conv_id, "projectId": project_id},
            snapshot=conv,
            source="project-scope",
        )
        save_persisted_state()
    elif project_id and owner and owner != project_id:
        await websocket.close(code=1008, reason="This session belongs to a different project")
        return
    generation = websocket.query_params.get("generation")
    raw_after = websocket.query_params.get("afterSeq")
    try:
        after_seq = int(raw_after) if raw_after is not None else None
    except ValueError:
        await websocket.close(code=1008, reason="afterSeq must be a non-negative integer")
        return
    if after_seq is not None and after_seq < 0:
        await websocket.close(code=1008, reason="afterSeq must be a non-negative integer")
        return
    await manager.connect(websocket, conv_id, generation, after_seq)
    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                message = json.loads(raw_message)
            except (TypeError, json.JSONDecodeError):
                continue
            if isinstance(message, dict) and message.get("type") == "SYNC_PING":
                await manager._send(websocket, {
                    "type": "SYNC_PONG",
                    "clientTime": message.get("clientTime"),
                    "serverTime": time.time(),
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)


ROLE_CATALOG_FILE = os.path.join(os.path.dirname(__file__), "role_catalog.json")

def load_role_catalog():
    if os.path.exists(ROLE_CATALOG_FILE):
        try:
            with open(ROLE_CATALOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

@app.get("/api/roles")
@app.get("/roles")
@app.get("/api/roles")
def get_roles():
    return {"roles": load_role_catalog()}


def is_meaningful_conversation(cid: str, conv: Dict[str, Any], current_cid: str) -> bool:
    if cid == current_cid:
        return True
    tt = conv.get("thinkTank", {})
    project = (tt.get("project") or "").strip()
    directive = (tt.get("directive") or "").strip()
    messages = conv.get("messages", [])
    subtasks = conv.get("subtasks", [])
    proposal = conv.get("proposal")
    return bool(project or directive or messages or subtasks or proposal)


def _build_conv_row(cid: str, c: Dict[str, Any], target_cid: str) -> Dict[str, Any]:
    tt = c.get("thinkTank", {})
    last_msg_ts = c.get("messages", [])[-1].get("timestamp") if c.get("messages") else None
    last_tool_ts = c.get("telemetry", {}).get("toolCalls", [])[-1].get("timestamp") if c.get("telemetry", {}).get("toolCalls") else None
    updated_at = c.get("updatedAt") or c.get("updated_at") or last_msg_ts or last_tool_ts or 0
    is_current = (cid == target_cid)
    p_name = tt.get("project")
    if not p_name:
        p_name = "مکالمه جاری" if is_current else "اتاق فکر بدون عنوان"
    return {
        "id": cid,
        "isCurrent": is_current,
        "projectScope": "bound" if c.get("projectId") else "unassigned",
        "project": p_name,
        "directive": tt.get("directive", "اتاق فکر فعال"),
        "phase": tt.get("phase", "اتاق فکر فعال"),
        "round": tt.get("round", 1 if is_current else 0),
        "maxRounds": tt.get("maxRounds", 50),
        "progress": tt.get("progress", 0),
        "status": tt.get("status", "ACTIVE"),
        "messagesCount": len(c.get("messages", [])),
        "subtasksCount": len(c.get("subtasks", [])),
        "updated_at": updated_at,
    }


@app.post("/api/host/active-session")
def set_active_session(payload: Dict[str, Any] = Body(...)):
    global active_conv_id
    cid = payload.get("conversationId")
    if cid and isinstance(cid, str):
        cid = cid.strip()
        active_conv_id = cid
        conv = get_or_create_conversation(cid)
        pid = payload.get("projectId")
        if pid and isinstance(pid, str):
            conv["projectId"] = pid.strip()
        try:
            persisted_state["activeConversationId"] = cid
            save_persisted_state()
        except Exception:
            pass
        return {"status": "ok", "activeConversationId": active_conv_id}
    return {"status": "error", "message": "Invalid conversationId"}


@app.get("/api/host/active-session")
@app.get("/api/host/context")
def get_active_session():
    global active_conv_id
    active_file = os.path.expanduser("~/.gemini/config/active_antigravity_session.json")
    if os.path.exists(active_file):
        try:
            with open(active_file, "r", encoding="utf-8") as f:
                sdata = json.load(f)
                if sdata.get("conversationId"):
                    active_conv_id = sdata["conversationId"].strip()
        except Exception:
            pass
    conv = conversations_store.get(active_conv_id, {})
    return {
        "conversationId": active_conv_id,
        "projectId": conv.get("projectId"),
        "project": conv.get("thinkTank", {}).get("project"),
        "status": conv.get("thinkTank", {}).get("status", "ACTIVE"),
    }


@app.get("/api/conversations")
def list_conversations():
    """Return selectable session metadata without loading or creating a session."""
    global active_conv_id
    active_file = os.path.expanduser("~/.gemini/config/active_antigravity_session.json")
    if os.path.exists(active_file):
        try:
            with open(active_file, "r", encoding="utf-8") as f:
                sdata = json.load(f)
                if sdata.get("conversationId"):
                    active_conv_id = sdata["conversationId"].strip()
        except Exception:
            pass

    target_cid = active_conv_id or "default"
    rows = []

    def _get_sort_ts(item):
        c = item[1]
        last_msg = c.get("messages", [])[-1].get("timestamp") if c.get("messages") else None
        last_tool = c.get("telemetry", {}).get("toolCalls", [])[-1].get("timestamp") if c.get("telemetry", {}).get("toolCalls") else None
        return c.get("updatedAt") or c.get("updated_at") or last_msg or last_tool or 0

    sorted_convs = sorted(conversations_store.items(), key=_get_sort_ts, reverse=True)
    for cid, conv in sorted_convs:
        if cid == "default" or not is_meaningful_conversation(cid, conv, target_cid):
            continue
        rows.append(_build_conv_row(cid, conv, target_cid))

    curr_idx = next((i for i, r in enumerate(rows) if r["id"] == target_cid), None)
    if curr_idx is not None and curr_idx > 0:
        c_item = rows.pop(curr_idx)
        c_item["isCurrent"] = True
        rows.insert(0, c_item)
    elif curr_idx is None and target_cid in conversations_store:
        rows.insert(0, _build_conv_row(target_cid, conversations_store[target_cid], target_cid))

    return {"conversations": rows}


@app.get("/api/status")
def get_status(convId: Optional[str] = Query(None)):
    global active_conv_id

    # Resolve active conversation from disk if not explicitly passed
    if not convId:
        active_file = os.path.expanduser("~/.gemini/config/active_antigravity_session.json")
        if os.path.exists(active_file):
            try:
                with open(active_file, "r", encoding="utf-8") as f:
                    sdata = json.load(f)
                    if sdata.get("conversationId"):
                        active_conv_id = sdata["conversationId"].strip()
            except Exception:
                pass

    target_cid = convId or active_conv_id or "default"
    project_id = request_project_id.get()
    target_conv = conversations_store.get(target_cid)
    if project_id and target_conv and not target_conv.get("projectId"):
        target_conv["projectId"] = project_id
    elif project_id and not target_conv:
        target_conv = get_or_create_conversation(target_cid)
        target_conv["projectId"] = project_id

    check_and_reload_state(target_cid)
    conv = get_or_create_conversation(target_cid)

    # Known conversation list for switcher UI
    conv_list = []

    def _get_sort_ts(item):
        c = item[1]
        last_msg = c.get("messages", [])[-1].get("timestamp") if c.get("messages") else None
        last_tool = c.get("telemetry", {}).get("toolCalls", [])[-1].get("timestamp") if c.get("telemetry", {}).get("toolCalls") else None
        return c.get("updatedAt") or c.get("updated_at") or last_msg or last_tool or 0

    sorted_convs = sorted(conversations_store.items(), key=_get_sort_ts, reverse=True)
    for cid, c in sorted_convs:
        if cid == "default" or not is_meaningful_conversation(cid, c, target_cid):
            continue
        conv_list.append(_build_conv_row(cid, c, target_cid))

    curr_idx = next((i for i, c in enumerate(conv_list) if c["id"] == target_cid), None)
    if curr_idx is not None and curr_idx > 0:
        c_item = conv_list.pop(curr_idx)
        c_item["isCurrent"] = True
        conv_list.insert(0, c_item)
    elif curr_idx is None:
        conv_list.insert(0, _build_conv_row(target_cid, conv, target_cid))


        cursor = sync_store.cursor(target_cid)
    imported_snapshot = cursor["last_event_type"] in {"SNAPSHOT_IMPORTED"}
    state_age_seconds = max(0.0, time.time() - float(cursor.get("updated_at") or time.time()))
    if imported_snapshot:
        freshness = "imported_snapshot"
    elif cursor["seq"] == 0:
        freshness = "empty"
    else:
        # A quiet conversation is still current at its durable cursor. Socket
        # liveness is tracked separately by the WebSocket heartbeat in the UI.
        freshness = "updated"
    return {
        "convId": target_cid,
        "thinkTank": conv["thinkTank"],
        "proposal": conv["proposal"],
        "review": conv.get("review"),
        "agents": conv["agents"],
        "messages": conv["messages"],
        "telemetry": conv["telemetry"],
        "collaborations": conv.get("collaborations", []),
        "subtasks": conv.get("subtasks", []),
        "roleUsage": role_usage(conv.get("messages", [])),
        "conversationsList": conv_list,
        "serverTime": time.strftime("%H:%M:%S"),
        "sync": cursor,
        "syncMode": "durable-websocket",
        "stateFreshness": freshness,
        "stateAgeSeconds": int(state_age_seconds),
    }


def upsert_agent_state(
    conv: Dict[str, Any],
    agent_id: str,
    *,
    name: Optional[str] = None,
    role: Optional[str] = None,
    code: Optional[str] = None,
    status: str = "ACTIVE",
    tool: Optional[str] = None,
    thought: Optional[str] = None,
    task: Optional[str] = None,
    collaborating_with: Optional[str] = None,
) -> bool:
    if not agent_id or not isinstance(agent_id, str):
        return False
    clean_id = normalize_agent_id(agent_id)
    if not clean_id or clean_id in {"operator", "user"}:
        return False

    agents = conv.setdefault("agents", [])
    matched = None
    for ag in agents:
        aid = normalize_agent_id(ag.get("id", ""))
        acode = normalize_agent_id(ag.get("code", ""))
        if aid == clean_id or acode == clean_id or aid.replace("_", "") == clean_id.replace("_", ""):
            matched = ag
            break

    if matched:
        if name and (not matched.get("name") or matched.get("name") == clean_id):
            matched["name"] = name
        if role and not matched.get("role"):
            matched["role"] = role
        if code and not matched.get("code"):
            matched["code"] = code
        if status:
            matched["status"] = status
        if tool:
            matched["tool"] = tool.strip()
            matched["activeTool"] = tool.strip()
        if thought:
            matched["thought"] = thought.strip()
        if task:
            matched["task"] = task.strip()
            matched["currentTask"] = task.strip()
        if collaborating_with:
            clean_cw = normalize_agent_id(collaborating_with)
            if clean_cw and clean_cw != clean_id:
                cwith = matched.setdefault("collaboratingWith", [])
                if clean_cw not in cwith:
                    cwith.append(clean_cw)
        return True

    catalog = load_role_catalog()
    cat_entry = next((r for r in catalog if normalize_agent_id(r.get("id", "")) == clean_id or normalize_agent_id(r.get("code", "")) == clean_id), None)

    title = name or (cat_entry.get("title") if cat_entry else None) or clean_id.replace("_", " ").title()
    spec = role or (cat_entry.get("specialty") if cat_entry else None) or "ساب‌ایجنت هوشمند"
    icon = (cat_entry.get("icon") if cat_entry else None) or "🤖"
    skills = cat_entry.get("skills", ["task-execution", "live-collaboration"]) if cat_entry else ["task-execution", "live-collaboration"]

    cwith_list = []
    if collaborating_with:
        clean_cw = normalize_agent_id(collaborating_with)
        if clean_cw and clean_cw != clean_id:
            cwith_list.append(clean_cw)

    profile = {
        "id": clean_id,
        "name": title,
        "role": spec,
        "icon": icon,
        "status": status,
        "task": task or f"فعالیت در نشست جاری ({title})",
        "currentTask": task or f"فعالیت در نشست جاری ({title})",
        "tool": tool.strip() if tool else None,
        "activeTool": tool.strip() if tool else None,
        "thought": thought.strip() if thought else None,
        "collaboratingWith": cwith_list,
        "skills": skills,
    }
    if code:
        profile["code"] = code
    agents.append(profile)
    return True


class AgentUpdateRequest(BaseModel):
    id: str
    name: Optional[str] = None
    role: Optional[str] = None
    code: Optional[str] = None
    icon: Optional[str] = None
    task: Optional[str] = None
    tool: Optional[str] = None
    thought: Optional[str] = None
    demo: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    latency: Optional[int] = None
    collaboratingWith: Optional[List[str]] = None
    convId: Optional[str] = None

@app.post("/api/agent/update")
async def update_agent_endpoint(req: AgentUpdateRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)

    updated = False
    for ag in conv["agents"]:
        ag_id = ag.get("id", "")
        if ag_id == req.id or ag_id == f"agent-{req.id}" or ag_id.replace("agent-", "") == req.id:
            if req.name is not None:
                ag["name"] = req.name
            if req.role is not None:
                ag["role"] = req.role
            if req.code is not None:
                ag["code"] = req.code
            if req.icon is not None:
                ag["icon"] = req.icon
            if req.task is not None:
                ag["task"] = req.task
                ag["currentTask"] = req.task
            if req.tool is not None:
                ag["tool"] = req.tool
                ag["activeTool"] = req.tool
            if req.thought is not None:
                ag["thought"] = req.thought
            if req.demo is not None:
                ag["demo"] = req.demo
            if req.status is not None:
                ag["status"] = req.status
            if req.progress is not None:
                ag["progress"] = req.progress
            if req.latency is not None:
                ag["latencyMs"] = req.latency
                ag["latency"] = req.latency
            if req.collaboratingWith is not None:
                ag["collaboratingWith"] = req.collaboratingWith
            updated = True
            break

    if not updated:
        profile = {"id": req.id}
        for key, value in (
            ("name", req.name),
            ("role", req.role),
            ("code", req.code),
            ("icon", req.icon),
            ("task", req.task),
            ("currentTask", req.task),
            ("tool", req.tool),
            ("activeTool", req.tool),
            ("thought", req.thought),
            ("demo", req.demo),
            ("status", req.status),
            ("progress", req.progress),
            ("latencyMs", req.latency),
            ("latency", req.latency),
            ("collaboratingWith", req.collaboratingWith),
        ):
            if value is not None:
                profile[key] = value
        conv["agents"].append(profile)
        updated = True

    if updated:
        save_persisted_state()
        await manager.broadcast({
            "type": "AGENTS_UPDATE",
            "convId": cid,
            "agents": conv["agents"]
        })
    return {"status": "ok", "convId": cid, "agents": conv["agents"]}


class TaskUpdateRequest(BaseModel):
    project: Optional[str] = None
    directive: Optional[str] = None
    status: Optional[str] = None
    phase: Optional[str] = None
    progress: Optional[int] = None
    activeAgentIds: Optional[List[str]] = None
    round: Optional[int] = None
    maxRounds: Optional[int] = None
    roleCaps: Optional[Dict[str, int]] = None
    roundStatus: Optional[str] = None
    convId: Optional[str] = None

@app.post("/api/task/update")
async def update_task(req: TaskUpdateRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    tt = conv["thinkTank"]

    if req.status == "COMPLETED":
        review = conv.get("review") or {}
        if review and review.get("status") == "REVIEW_REQUESTED" and (review.get("confidence", 0) < 95 or review.get("decision") != "complete"):
            raise HTTPException(status_code=409, detail="Completion requires a manager and main-agent review with an evidence score of at least 95.")

    if req.project:
        tt["project"] = req.project
    if req.directive:
        tt["directive"] = req.directive
    if req.status:
        tt["status"] = req.status
        if req.status in {"COMPLETED", "IDLE"}:
            if req.status == "COMPLETED":
                tt["progress"] = 100
                if not req.phase:
                    tt["phase"] = "تکمیل‌شده — آماده برای تسک جدید"
            for ag in conv.get("agents", []):
                ag["status"] = "IDLE"
                ag["activeTool"] = None
                ag["tool"] = None
                ag["currentTask"] = "آماده دریافت تسک جدید"
                ag["thought"] = "عملیات با موفقیت به پایان رسید"
                ag["currentThought"] = "عملیات با موفقیت به پایان رسید"
                ag["collaboratingWith"] = []
            for st in conv.get("subtasks", []):
                st["status"] = "COMPLETED"
            if conv.get("proposal"):
                if conv["proposal"].get("status") in {"AWAITING_APPROVAL", "PROPOSED", "APPROVED", "EXECUTING"}:
                    conv["proposal"]["status"] = "COMPLETED"
    if req.phase:
        tt["phase"] = req.phase
    if req.progress is not None:
        tt["progress"] = req.progress
    if req.round is not None:
        if req.round > normalize_round_limit(tt.get("maxRounds", 50)):
            raise HTTPException(status_code=409, detail="The round limit has been reached. Extend the limit before starting another round.")
        tt["round"] = req.round
    if req.maxRounds is not None:
        tt["maxRounds"] = normalize_round_limit(req.maxRounds)
    if req.roleCaps is not None:
        tt["roleCaps"] = normalize_role_caps(req.roleCaps)
    if req.roundStatus:
        tt["roundStatus"] = req.roundStatus

    save_persisted_state()
    await manager.broadcast({
        "type": "STATE_UPDATE",
        "convId": cid,
        "thinkTank": tt,
        "proposal": conv["proposal"],
        "review": conv.get("review"),
        "agents": conv["agents"],
    })
    return {"status": "updated", "convId": cid, "thinkTank": tt}


class ProposalUpdateRequest(BaseModel):
    id: str
    project: str
    title: str
    author: str
    summary: str
    decisionOptions: Optional[List[Dict[str, Any]]] = None
    votes: Optional[List[Dict[str, Any]]] = None
    convId: Optional[str] = None

@app.post("/api/proposal/update")
async def update_proposal(req: ProposalUpdateRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)

    conv["proposal"] = {
        "id": req.id,
        "project": req.project,
        "title": req.title,
        "author": req.author,
        "status": "AWAITING_APPROVAL",
        "summary": req.summary,
        "decisionOptions": req.decisionOptions or [],
        "votes": req.votes or [],
        "userDecision": None,
        "lastActionAt": None,
    }
    conv["thinkTank"]["status"] = "ACTIVE"
    conv["thinkTank"]["phase"] = "Awaiting User Approval on Proposal"
    save_persisted_state()

    await manager.broadcast({
        "type": "PROPOSAL_UPDATE",
        "convId": cid,
        "proposal": conv["proposal"],
        "thinkTank": conv["thinkTank"],
    })
    return {"status": "ok", "convId": cid, "proposal": conv["proposal"]}


class ProposalActionRequest(BaseModel):
    action: str  # approve, request_revision, select_option, halt
    optionId: Optional[str] = None
    comment: Optional[str] = None
    convId: Optional[str] = None

@app.post("/api/proposal/action")
async def handle_proposal_action(req: ProposalActionRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    current_prop = conv["proposal"]
    tt = conv["thinkTank"]
    msgs = conv["messages"]
    now_str = time.strftime("%H:%M:%S")

    if req.action == "approve":
        current_prop["status"] = "APPROVED"
        current_prop["userDecision"] = {
            "action": "APPROVED",
            "optionId": req.optionId,
            "comment": req.comment or "طرح توسط کاربر تایید و دستور اجرای قطعی صادر شد.",
            "timestamp": now_str
        }
        tt["status"] = "EXECUTING"
        tt["progress"] = 90
        tt["phase"] = "Applying Changes & Final Production Verification"

        msgs.append({
            "id": f"act-{time.time()}",
            "channel": "MAIN",
            "senderCode": "OPERATOR",
            "senderName": "Operator",
            "senderRole": "owner",
            "timestamp": now_str,
            "content": f"✅ [تایید رسمی کاربر]: طرح «{current_prop['title']}» مورد تایید قرار گرفت و دستور اجرا صادر شد."
        })

    elif req.action == "select_option":
        current_prop["userDecision"] = {
            "action": "OPTION_SELECTED",
            "optionId": req.optionId,
            "comment": req.comment,
            "timestamp": now_str
        }
        selected_text = req.optionId
        for opt in current_prop.get("decisionOptions", []):
            if opt.get("id") == req.optionId:
                selected_text = opt.get("label", req.optionId)
                break
        
        msgs.append({
            "id": f"act-{time.time()}",
            "channel": "MAIN",
            "senderCode": "OPERATOR",
            "senderName": "Operator",
            "senderRole": "owner",
            "timestamp": now_str,
            "content": f"🎯 [انتخاب گزینه توسط کاربر]: «{selected_text}»\nپروسه با گزینه انتخابی ادامه می‌یابد."
        })

    elif req.action == "request_revision":
        current_prop["status"] = "REVISION_REQUESTED"
        current_prop["userDecision"] = {
            "action": "REVISION_REQUESTED",
            "comment": req.comment or "درخواست اصلاح و بازنگری توسط کاربر ثبت شد.",
            "timestamp": now_str
        }
        tt["status"] = "ACTIVE"
        tt["phase"] = "Council Revising Plan According to Feedback"

        msgs.append({
            "id": f"act-{time.time()}",
            "channel": "SUBAGENTS",
            "senderCode": "OPERATOR",
            "senderName": "Operator",
            "senderRole": "owner",
            "timestamp": now_str,
            "content": f"📝 [درخواست اصلاح از سوی کاربر]: لطفا طرح بازنگری و مجددا چکش‌کاری شود.\nتوضیحات: {req.comment or 'عدم تایید نسخه فعلی'}"
        })

    elif req.action == "halt":
        current_prop["status"] = "HALTED"
        tt["status"] = "HALTED"
        tt["phase"] = "Session Halted by Operator"

        msgs.append({
            "id": f"act-{time.time()}",
            "channel": "MAIN",
            "senderCode": "OPERATOR",
            "senderName": "Operator",
            "senderRole": "owner",
            "timestamp": now_str,
            "content": "🛑 [دستور توقف توسط کاربر]: نشست اتاق فکر به درخواست صریح کاربر متوقف گردید."
        })

    current_prop["lastActionAt"] = now_str
    save_persisted_state()

    await manager.broadcast({
        "type": "PROPOSAL_UPDATE",
        "convId": cid,
        "proposal": current_prop,
        "thinkTank": tt,
        "messages": msgs,
    })
    return {"status": "ok", "convId": cid, "proposal": current_prop, "thinkTank": tt}


class ProposalVoteRequest(BaseModel):
    voter: str
    voterName: Optional[str] = None
    voterRole: Optional[str] = None
    stance: str = "APPROVE"  # APPROVE, CONDITIONAL, CRITIQUE, REJECT
    confidence: int = 90
    comment: str
    counterArgument: Optional[str] = None
    convId: Optional[str] = None


@app.post("/api/proposal/vote")
async def vote_proposal(req: ProposalVoteRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    tt = conv["thinkTank"]
    msgs = conv["messages"]
    now_str = time.strftime("%H:%M:%S")

    if not conv.get("proposal"):
        conv["proposal"] = {
            "id": f"prop-{int(time.time())}",
            "project": tt.get("project") or "پروژه جاری",
            "title": tt.get("directive") or "طرح راهبردی اتاق فکر",
            "author": "Council",
            "status": "AWAITING_APPROVAL",
            "summary": tt.get("directive") or "بررسی و هم‌افزایی شورای اتاق فکر",
            "decisionOptions": [
                {"id": "opt-1", "label": "تأیید و اجرای کامل طرح"},
                {"id": "opt-2", "label": "بازنگری بر اساس نقدها"},
            ],
            "votes": [],
            "userDecision": None,
            "lastActionAt": None,
        }

    prop = conv["proposal"]
    votes = prop.setdefault("votes", [])
    canon_voter = normalize_agent_id(req.voter) or req.voter.strip()
    stance_upper = (req.stance or "APPROVE").upper().strip()

    # Resolve voter display name from role_catalog if not given
    voter_name = req.voterName or req.voter
    try:
        catalog_path = os.path.join(os.path.dirname(__file__), "role_catalog.json")
        if os.path.exists(catalog_path):
            with open(catalog_path, "r", encoding="utf-8") as cf:
                cdata = json.load(cf)
                croles = cdata if isinstance(cdata, list) else cdata.get("roles", [])
                for cr in croles:
                    if normalize_agent_id(cr.get("id", "")) == canon_voter or normalize_agent_id(cr.get("agent_name", "")) == canon_voter:
                        voter_name = req.voterName or cr.get("title") or cr.get("title_fa") or voter_name
                        break
    except Exception:
        pass

    vote_entry = {
        "voter": canon_voter,
        "voterName": voter_name,
        "voterRole": req.voterRole or canon_voter,
        "stance": stance_upper,
        "confidence": max(0, min(100, int(req.confidence))),
        "comment": req.comment.strip(),
        "counterArgument": (req.counterArgument or "").strip() or None,
        "timestamp": now_str,
    }

    replaced = False
    for idx_v, existing in enumerate(votes):
        if normalize_agent_id(existing.get("voter", "")) == canon_voter:
            votes[idx_v] = vote_entry
            replaced = True
            break
    if not replaced:
        votes.append(vote_entry)

    stance_labels = {
        "APPROVE": "✅ موافق (تأیید طرح)",
        "CONDITIONAL": "⚠️ موافق مشروط",
        "CRITIQUE": "⚔ نقد و چالش راهبردی",
        "REJECT": "🛑 مخالف (رد طرح)",
    }
    stance_badge = stance_labels.get(stance_upper, stance_upper)

    msg_entry = {
        "id": f"vote-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}",
        "channel": "COUNCIL",
        "senderCode": canon_voter.upper(),
        "senderName": voter_name,
        "senderRole": req.voterRole or canon_voter,
        "recipientCode": "COUNCIL",
        "recipientName": "شورای تصمیم‌گیری اتاق فکر",
        "timestamp": now_str,
        "content": f"{stance_badge} (اطمینان: {vote_entry['confidence']}٪)\n{req.comment.strip()}",
        "thoughts": req.comment.strip() if stance_upper in {"APPROVE", "CONDITIONAL"} else None,
        "critique": (req.counterArgument or req.comment).strip() if stance_upper in {"CRITIQUE", "REJECT"} else None,
        "convId": cid,
    }
    msgs.append(msg_entry)

    upsert_agent_state(
        conv,
        canon_voter,
        name=voter_name,
        role=req.voterRole or canon_voter,
        status="ACTIVE",
        thought=f"{stance_badge}: {req.comment.strip()[:80]}",
    )

    save_persisted_state()
    await manager.broadcast({
        "type": "PROPOSAL_UPDATE",
        "convId": cid,
        "proposal": prop,
        "thinkTank": tt,
        "agents": conv["agents"],
        "messages": msgs,
    })
    return {"status": "ok", "convId": cid, "vote": vote_entry, "proposal": prop}


class SubtaskUpsertRequest(BaseModel):
    id: Optional[str] = None
    title: str
    assignee: str
    assigneeName: Optional[str] = None
    delegatedBy: Optional[str] = "team_manager"
    delegatedByName: Optional[str] = "مدیر تیم"
    status: str = "ASSIGNED"  # ASSIGNED, IN_PROGRESS, IN_REVIEW, COMPLETED, BLOCKED
    priority: str = "HIGH"  # HIGH, MEDIUM, LOW
    deliverable: Optional[str] = ""
    thoughts: Optional[str] = None
    report: Optional[str] = None
    dependencies: Optional[List[str]] = None
    convId: Optional[str] = None


@app.post("/api/subtasks/upsert")
async def upsert_subtask(req: SubtaskUpsertRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    tt = conv["thinkTank"]
    msgs = conv["messages"]
    subtasks = conv.setdefault("subtasks", [])
    now_str = time.strftime("%H:%M:%S")

    canon_assignee = normalize_agent_id(req.assignee) or req.assignee.strip()
    canon_delegator = normalize_agent_id(req.delegatedBy or "team_manager") or "team_manager"
    status_upper = (req.status or "ASSIGNED").upper().strip()
    priority_upper = (req.priority or "HIGH").upper().strip()

    assignee_name = req.assigneeName or req.assignee
    try:
        catalog_path = os.path.join(os.path.dirname(__file__), "role_catalog.json")
        if os.path.exists(catalog_path):
            with open(catalog_path, "r", encoding="utf-8") as cf:
                cdata = json.load(cf)
                croles = cdata if isinstance(cdata, list) else cdata.get("roles", [])
                for cr in croles:
                    if normalize_agent_id(cr.get("id", "")) == canon_assignee or normalize_agent_id(cr.get("agent_name", "")) == canon_assignee:
                        assignee_name = req.assigneeName or cr.get("title") or cr.get("title_fa") or assignee_name
                        break
    except Exception:
        pass

    subtask_id = (req.id or "").strip()
    existing_idx = -1
    for i, st in enumerate(subtasks):
        if (subtask_id and st.get("id") == subtask_id) or (
            not subtask_id
            and st.get("title", "").strip() == req.title.strip()
            and normalize_agent_id(st.get("assignee", "")) == canon_assignee
        ):
            existing_idx = i
            subtask_id = st.get("id") or f"task-{i + 1}"
            break

    if not subtask_id:
        subtask_id = f"task-{len(subtasks) + 1}-{int(time.time()) % 10000}"

    entry = {
        "id": subtask_id,
        "title": req.title.strip(),
        "assignee": canon_assignee,
        "assigneeName": assignee_name,
        "delegatedBy": canon_delegator,
        "delegatedByName": req.delegatedByName or "مدیر تیم",
        "status": status_upper,
        "priority": priority_upper,
        "deliverable": (req.deliverable or "").strip(),
        "thoughts": (req.thoughts or "").strip() or (existing_entry.get("thoughts", "") if existing_idx >= 0 and (existing_entry := subtasks[existing_idx]) else ""),
        "report": (req.report or "").strip() or (existing_entry.get("report", "") if existing_idx >= 0 and (existing_entry := subtasks[existing_idx]) else ""),
        "dependencies": req.dependencies or [],
        "updatedAt": now_str,
    }

    if existing_idx >= 0:
        subtasks[existing_idx] = entry
    else:
        subtasks.insert(0, entry)

    # Update Think Tank progress automatically from subtasks completion ratio
    if subtasks:
        done_count = sum(1 for s in subtasks if s.get("status") == "COMPLETED")
        in_prog_count = sum(1 for s in subtasks if s.get("status") in {"IN_PROGRESS", "IN_REVIEW"})
        calc_progress = int(((done_count + 0.5 * in_prog_count) / len(subtasks)) * 100)
        tt["progress"] = max(10, min(100, calc_progress))
        if done_count < len(subtasks) and tt.get("status") in {"DISCONNECTED", "IDLE", "COMPLETED"}:
            tt["status"] = "ACTIVE"

    # Update assignee subagent state
    if status_upper == "COMPLETED":
        other_active = any(
            s.get("id") != subtask_id
            and normalize_agent_id(s.get("assignee", "")) == canon_assignee
            and s.get("status") in {"ASSIGNED", "IN_PROGRESS", "IN_REVIEW"}
            for s in subtasks
        )
        upsert_agent_state(
            conv,
            canon_assignee,
            name=assignee_name,
            role=canon_assignee,
            status="ACTIVE" if other_active else "IDLE",
            task="تسک تحویل شد — آماده تسک بعدی" if not other_active else req.title.strip(),
            thought=f"✅ تکمیل تسک: {req.deliverable or req.title.strip()}",
        )
    else:
        upsert_agent_state(
            conv,
            canon_assignee,
            name=assignee_name,
            role=canon_assignee,
            status="ACTIVE",
            task=req.title.strip(),
            thought=f"در حال اجرای تسک ({status_upper}): {req.title.strip()}",
            collaborating_with=canon_delegator,
        )

    status_fa = {
        "ASSIGNED": "📋 واگذاری تسک جدید",
        "IN_PROGRESS": "⚡ شروع اجرای تسک",
        "IN_REVIEW": "🔍 ارسال تسک برای بازبینی کیفیت",
        "COMPLETED": "✅ تکمیل و تحویل تسک",
        "BLOCKED": "🚧 گزارش مانع در تسک",
    }.get(status_upper, status_upper)

    msg_content = f"{status_fa}: «{req.title.strip()}»\nمسئول اجرا: {assignee_name} ({canon_assignee})"
    if req.deliverable:
        msg_content += f"\n📦 خروجی و شواهد: {req.deliverable.strip()}"

    default_thought = (
        f"تحلیل، بررسی پیش‌نیازها و اجرای گام‌به‌گام تسک «{req.title.strip()}» توسط {assignee_name}. "
        f"(اولویت: {priority_upper} | وضعیت فعلی: {status_upper})"
        + (f" — شواهد و فایل‌های هدف: {req.deliverable.strip()}" if req.deliverable else "")
    )
    msg_thoughts = (req.thoughts or "").strip() or entry.get("thoughts") or default_thought
    msg_report = (req.report or "").strip() or entry.get("report") or None

    msgs.append({
        "id": f"subtask-msg-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}",
        "channel": "SUBAGENTS",
        "senderCode": canon_delegator.upper() if status_upper == "ASSIGNED" else canon_assignee.upper(),
        "senderName": (req.delegatedByName or "مدیر تیم") if status_upper == "ASSIGNED" else assignee_name,
        "senderRole": canon_delegator if status_upper == "ASSIGNED" else canon_assignee,
        "recipientCode": canon_assignee.upper() if status_upper == "ASSIGNED" else canon_delegator.upper(),
        "recipientName": assignee_name if status_upper == "ASSIGNED" else (req.delegatedByName or "مدیر تیم"),
        "timestamp": now_str,
        "content": msg_content,
        "thoughts": msg_thoughts,
        "report": msg_report,
        "convId": cid,
    })

    save_persisted_state()
    await manager.broadcast({
        "type": "SUBTASKS_UPDATE",
        "convId": cid,
        "subtasks": subtasks,
        "agents": conv["agents"],
        "thinkTank": tt,
        "messages": msgs,
    })
    return {"status": "ok", "convId": cid, "subtask": entry, "subtasks": subtasks}


class ChatMessageRequest(BaseModel):
    id: Optional[str] = None
    channel: str = "MAIN"
    senderCode: str
    senderName: str
    senderRole: str
    recipientCode: Optional[str] = None
    recipientName: Optional[str] = None
    recipientRole: Optional[str] = None
    recipient: Optional[str] = None
    timestamp: Optional[str] = None
    content: str
    thoughts: Optional[str] = None
    thought: Optional[str] = None
    critique: Optional[str] = None
    counterArgument: Optional[str] = None
    question: Optional[str] = None
    questions: Optional[List[str]] = None
    report: Optional[str] = None
    fullReport: Optional[str] = None
    topic: Optional[str] = None
    isBtw: bool = False
    isOperator: bool = False
    isReview: bool = False
    reviewId: Optional[str] = None
    convId: Optional[str] = None
    model_config = {"extra": "allow"}

def generate_subagent_btw_reply(content: str, agents: List[Dict[str, Any]], conv_id: str) -> Optional[Dict[str, Any]]:
    # Replies must come from an actual subagent event through the bridge.
    # The previous canned replies reported checks that had never run.
    return None

@app.post("/api/chat/send")
async def send_chat(req: ChatMessageRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)

    msg_dict = req.model_dump()
    if not msg_dict.get("id"):
        msg_dict["id"] = f"msg-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    if not msg_dict.get("timestamp"):
        msg_dict["timestamp"] = time.strftime("%H:%M:%S")

    # Auto-detect recipient from @mention in content if not explicitly passed
    if not (msg_dict.get("recipient") or msg_dict.get("recipientName") or msg_dict.get("recipientCode")):
        mention_match = re.search(r"@([A-Za-z0-9_\u0600-\u06FF-]+)", msg_dict.get("content", ""))
        if mention_match:
            recip = mention_match.group(1).strip()
            msg_dict["recipient"] = recip
            msg_dict["recipientName"] = recip
            msg_dict["recipientCode"] = recip.upper()

    if any(existing.get("id") == msg_dict.get("id") for existing in conv["messages"] if isinstance(existing, dict)):
        return {"status": "duplicate", "convId": cid, "message": msg_dict}
    bucket = role_bucket(msg_dict.get("senderRole"))
    if msg_dict.get("isReview"):
        review = conv.get("review") or {}
        if bucket not in {"main", "manager"}:
            raise HTTPException(status_code=409, detail="Only the main agent and team manager can post review messages.")
        if (
            review.get("status") not in {"DISPATCH_PENDING", "DISPATCH_FAILED", "AWAITING_TEAM_REVIEW"}
            or not msg_dict.get("reviewId")
            or msg_dict.get("reviewId") != review.get("id")
        ):
            raise HTTPException(status_code=409, detail="Review messages must reference the current pending review request.")
    elif bucket and not msg_dict.get("isOperator"):
        caps = normalize_role_caps(conv["thinkTank"].get("roleCaps"))
        usage = role_usage(conv["messages"])
        if usage[bucket] >= caps[bucket]:
            raise HTTPException(status_code=409, detail=f"The {bucket} message cap ({caps[bucket]}) has been reached for this session.")
    is_btw_inquiry = msg_dict.get("isBtw") or msg_dict.get("content", "").startswith("/btw") or "/btw" in msg_dict.get("senderCode", "")
    if is_btw_inquiry:
        msg_dict["isBtw"] = True
        msg_dict["channel"] = "SUBAGENTS"
    elif msg_dict.get("channel") == "ALL":
        msg_dict["channel"] = "MAIN"

    # Track subagent-to-subagent peer activity in agents state
    agents_modified = False
    sender_clean = normalize_agent_id(msg_dict.get("senderCode") or msg_dict.get("senderRole"))
    recipient_clean = normalize_agent_id(msg_dict.get("recipient") or msg_dict.get("recipientCode") or msg_dict.get("recipientRole"))

    if sender_clean and not msg_dict.get("isOperator") and sender_clean != "user":
        agents_modified |= upsert_agent_state(
            conv,
            sender_clean,
            name=msg_dict.get("senderName"),
            role=msg_dict.get("senderRole"),
            code=msg_dict.get("senderCode"),
            status="ACTIVE",
            thought=msg_dict.get("thoughts") or msg_dict.get("thought"),
            collaborating_with=recipient_clean if (recipient_clean and recipient_clean != sender_clean) else None,
        )
    if recipient_clean and recipient_clean != sender_clean and recipient_clean != "user":
        agents_modified |= upsert_agent_state(
            conv,
            recipient_clean,
            name=msg_dict.get("recipientName") or msg_dict.get("recipient"),
            role=msg_dict.get("recipientRole"),
            code=msg_dict.get("recipientCode"),
            status="ACTIVE",
            collaborating_with=sender_clean,
        )

    conv["messages"].append(msg_dict)
    save_persisted_state()
    await manager.broadcast({
        "type": "NEW_MESSAGE",
        "convId": cid,
        "message": msg_dict
    })
    if agents_modified:
        await manager.broadcast({
            "type": "AGENTS_UPDATE",
            "convId": cid,
            "agents": conv["agents"]
        })

    if is_btw_inquiry and msg_dict.get("isOperator"):
        reply = generate_subagent_btw_reply(msg_dict.get("content", ""), conv["agents"], cid)
        if reply:
            conv["messages"].append(reply)
            save_persisted_state()
            await manager.broadcast({
                "type": "NEW_MESSAGE",
                "convId": cid,
                "message": reply
            })

    return {"status": "sent", "convId": cid, "message": msg_dict}


# --- Deliberation Round Governance Endpoints ---

class ExtendRoundsRequest(BaseModel):
    additionalRounds: int = Field(default=3, ge=1, le=50)
    convId: Optional[str] = None


@app.post("/api/governance/extend_rounds")
async def extend_rounds_endpoint(req: ExtendRoundsRequest):
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    tt = conv["thinkTank"]
    tt["maxRounds"] = normalize_round_limit(tt.get("maxRounds", 50))
    tt["maxRounds"] = min(500, tt["maxRounds"] + req.additionalRounds)
    tt["roundStatus"] = "ACTIVE"

    msg = {
        "id": f"gov-{uuid.uuid4()}",
        "channel": "MAIN",
        "senderCode": "OWNER",
        "senderName": "کاربر",
        "senderRole": "owner",
        "isOperator": True,
        "timestamp": time.strftime("%H:%M:%S"),
        "content": f"سقف دورهای گفتگو با درخواست کاربر به {tt['maxRounds']} افزایش یافت.",
    }
    conv["messages"].append(msg)
    save_persisted_state()
    await manager.broadcast({
        "type": "GOVERNANCE_UPDATE",
        "convId": cid,
        "thinkTank": tt,
        "review": conv.get("review"),
        "message": msg,
    })
    return {"status": "extended", "convId": cid, "maxRounds": tt["maxRounds"], "roundStatus": "ACTIVE"}


class CompressFinalRequest(BaseModel):
    convId: Optional[str] = None


@app.post("/api/governance/compress_final")
async def compress_final_endpoint(req: CompressFinalRequest):
    """Request a real manager review; never synthesize an agent proposal or vote."""
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    tt = conv["thinkTank"]
    tt["roundStatus"] = "REVIEW_REQUESTED"
    tt["phase"] = "درخواست بازبینی مدیر تیم"
    review_id = f"review-{uuid.uuid4()}"
    conv["review"] = {
        "id": review_id,
        "status": "DISPATCH_PENDING",
        "dispatchStatus": "pending",
        "requestedAt": time.time(),
        "confidence": None,
        "confidenceLabel": "evidence_score",
        "humanRequired": False,
        "managerSummary": "",
        "mainSummary": "",
        "continueReasons": [],
        "completionReasons": [],
        "evidence": [],
        "decision": None,
    }
    save_persisted_state()
    await manager.broadcast({
        "type": "GOVERNANCE_REVIEW_REQUEST",
        "convId": cid,
        "thinkTank": tt,
        "review": conv["review"],
    })
    return {"status": "review_requested", "convId": cid, "review": conv["review"]}


class ReviewDispatchRequest(BaseModel):
    status: str = Field(pattern="^(sent|failed)$")
    error: Optional[str] = None
    convId: Optional[str] = None


@app.post("/api/governance/review_dispatch")
async def review_dispatch_endpoint(req: ReviewDispatchRequest):
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    review = conv.get("review")
    if not review or review.get("status") not in {"DISPATCH_PENDING", "DISPATCH_FAILED", "AWAITING_TEAM_REVIEW"}:
        raise HTTPException(status_code=409, detail="There is no pending team review request.")
    review["dispatchStatus"] = req.status
    review["dispatchError"] = (req.error or "")[:800] if req.status == "failed" else ""
    review["status"] = "AWAITING_TEAM_REVIEW" if req.status == "sent" else "DISPATCH_FAILED"
    save_persisted_state()
    await manager.broadcast({
        "type": "GOVERNANCE_REVIEW_DISPATCH",
        "convId": cid,
        "review": review,
        "thinkTank": conv["thinkTank"],
    })
    return {"status": "ok", "convId": cid, "review": review}


class ReviewSubmissionRequest(BaseModel):
    reviewId: str = Field(min_length=1, max_length=200)
    managerSummary: str = Field(min_length=1, max_length=4000)
    mainSummary: str = Field(min_length=1, max_length=4000)
    confidence: int = Field(ge=0, le=100)
    recommendation: str = Field(pattern="^(continue|complete)$")
    continueReasons: List[str] = Field(min_length=1, max_length=8)
    completionReasons: List[str] = Field(min_length=1, max_length=8)
    evidence: List[str] = Field(min_length=1, max_length=12)
    convId: Optional[str] = None


@app.post("/api/governance/submit_review")
async def submit_review_endpoint(req: ReviewSubmissionRequest):
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    existing = conv.get("review")
    if not existing or existing.get("status") not in {"AWAITING_TEAM_REVIEW", "DISPATCH_PENDING"}:
        raise HTTPException(status_code=409, detail="A team review was not requested for this session.")
    if req.reviewId != existing.get("id"):
        raise HTTPException(status_code=409, detail="The review submission does not match the current review request.")

    review_messages = {
        role_bucket(message.get("senderRole")): message
        for message in conv.get("messages", [])
        if isinstance(message, dict)
        and message.get("isReview") is True
        and message.get("reviewId") == existing.get("id")
        and role_bucket(message.get("senderRole")) in {"manager", "main"}
    }
    if "manager" not in review_messages or "main" not in review_messages:
        raise HTTPException(status_code=409, detail="The team manager and main agent must first post their real review messages.")
    if (
        req.managerSummary.strip() != str(review_messages["manager"].get("content", "")).strip()
        or req.mainSummary.strip() != str(review_messages["main"].get("content", "")).strip()
    ):
        raise HTTPException(status_code=422, detail="Review summaries must match the current messages visible in the Think Tank room.")
    if not all(str(reason).strip() for reason in req.continueReasons + req.completionReasons + req.evidence):
        raise HTTPException(status_code=422, detail="Review reasons and evidence cannot be blank.")

    try:
        decision = evaluate_review(req.confidence, req.managerSummary, req.mainSummary, req.recommendation)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    review = {
        **existing,
        **decision,
        "continueReasons": [str(item).strip() for item in req.continueReasons],
        "completionReasons": [str(item).strip() for item in req.completionReasons],
        "evidence": [str(item).strip() for item in req.evidence],
        "submittedAt": time.time(),
    }
    conv["review"] = review
    tt = conv["thinkTank"]
    if review["humanRequired"]:
        tt["roundStatus"] = "WAITING_FOR_HUMAN"
        tt["phase"] = "در انتظار تصمیم شما"
    elif review["decision"] == "complete":
        tt["roundStatus"] = "COMPLETE"
        tt["status"] = "COMPLETED"
        tt["phase"] = "بازبینی مدیر و ایجنت اصلی کامل شد"
    else:
        tt["roundStatus"] = "ACTIVE"
        tt["status"] = "ACTIVE"
        tt["phase"] = "ادامه کار بر اساس بازبینی تیم"
    save_persisted_state()
    await manager.broadcast({
        "type": "GOVERNANCE_REVIEW_SUBMITTED",
        "convId": cid,
        "review": review,
        "thinkTank": tt,
    })
    return {"status": "ok", "convId": cid, "review": review, "thinkTank": tt}


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(pattern="^(continue|stop)$")
    note: Optional[str] = Field(default=None, max_length=1200)
    convId: Optional[str] = None


@app.post("/api/governance/review_decision")
async def review_decision_endpoint(req: ReviewDecisionRequest):
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    review = conv.get("review")
    if not review or review.get("status") != "WAITING_FOR_HUMAN" or not review.get("humanRequired"):
        raise HTTPException(status_code=409, detail="No human decision is currently required.")

    decided_at = time.time()
    review["decision"] = req.decision
    review["humanDecision"] = {"decision": req.decision, "note": req.note or "", "decidedAt": decided_at, "dispatchStatus": "pending"}
    review["status"] = "HUMAN_CONTINUE" if req.decision == "continue" else "HUMAN_STOP"
    tt = conv["thinkTank"]
    tt["roundStatus"] = "ACTIVE" if req.decision == "continue" else "HALTED"
    tt["status"] = "ACTIVE" if req.decision == "continue" else "HALTED"
    tt["phase"] = "ادامه با تصمیم کاربر" if req.decision == "continue" else "توقف با تصمیم کاربر"
    msg = {
        "id": f"review-decision-{uuid.uuid4()}",
        "channel": "MAIN",
        "senderCode": "OWNER",
        "senderName": "کاربر",
        "senderRole": "owner",
        "isOperator": True,
        "timestamp": time.strftime("%H:%M:%S"),
        "content": ("ادامهٔ کار" if req.decision == "continue" else "توقف کار") + (f" — {req.note.strip()}" if req.note and req.note.strip() else ""),
    }
    conv["messages"].append(msg)
    save_persisted_state()
    await manager.broadcast({
        "type": "GOVERNANCE_REVIEW_DECISION",
        "convId": cid,
        "review": review,
        "thinkTank": tt,
        "message": msg,
    })
    return {"status": "ok", "convId": cid, "review": review, "thinkTank": tt}


class ReviewDecisionDispatchRequest(BaseModel):
    status: str = Field(pattern="^(sent|failed)$")
    error: Optional[str] = None
    convId: Optional[str] = None


@app.post("/api/governance/review_decision_dispatch")
async def review_decision_dispatch_endpoint(req: ReviewDecisionDispatchRequest):
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    review = conv.get("review")
    human_decision = (review or {}).get("humanDecision")
    if not human_decision:
        raise HTTPException(status_code=409, detail="There is no human review decision to deliver.")
    human_decision["dispatchStatus"] = req.status
    human_decision["dispatchError"] = (req.error or "")[:800] if req.status == "failed" else ""
    save_persisted_state()
    await manager.broadcast({
        "type": "GOVERNANCE_REVIEW_DISPATCH",
        "convId": cid,
        "review": review,
        "thinkTank": conv["thinkTank"],
    })
    return {"status": "ok", "convId": cid, "review": review}


class CollaborateRequest(BaseModel):
    fromAgent: str
    toAgent: str
    label: Optional[str] = "همکاری و مباحثه فعال"
    crosstalkMessage: Optional[str] = None
    content: Optional[str] = None
    thoughts: Optional[str] = None
    thought: Optional[str] = None
    critique: Optional[str] = None
    question: Optional[str] = None
    report: Optional[str] = None
    fullReport: Optional[str] = None
    topic: Optional[str] = None
    convId: Optional[str] = None
    model_config = {"extra": "allow"}

@app.post("/api/agent/collaborate")
async def collaborate_endpoint(req: CollaborateRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    
    from_id = normalize_agent_id(req.fromAgent)
    to_id = normalize_agent_id(req.toAgent)
    
    collabs = conv.setdefault("collaborations", [])
    existing = next((c for c in collabs if (c.get("from") == from_id and c.get("to") == to_id) or (c.get("from") == to_id and c.get("to") == from_id)), None)
    if existing:
        existing["active"] = True
        existing["label"] = req.label or existing.get("label", "همکاری و مباحثه فعال")
    else:
        collabs.append({
            "from": from_id,
            "to": to_id,
            "label": req.label or "همکاری و مباحثه فعال",
            "active": True
        })
        
    catalog = load_role_catalog()
    from_name = next((a.get("name") for a in conv["agents"] if normalize_agent_id(a.get("id")) == from_id), None)
    if not from_name:
        from_name = next((r.get("title") for r in catalog if normalize_agent_id(r.get("id")) == from_id), from_id.upper())
    to_name = next((a.get("name") for a in conv["agents"] if normalize_agent_id(a.get("id")) == to_id), None)
    if not to_name:
        to_name = next((r.get("title") for r in catalog if normalize_agent_id(r.get("id")) == to_id), to_id.upper())

    upsert_agent_state(
        conv,
        from_id,
        name=from_name,
        status="ACTIVE",
        thought=req.thoughts or req.thought,
        collaborating_with=to_id,
    )
    upsert_agent_state(
        conv,
        to_id,
        name=to_name,
        status="ACTIVE",
        collaborating_with=from_id,
    )
        
    msg_text = req.content or req.crosstalkMessage
    collab_msg = None
    if msg_text:
        collab_msg = {
            "id": f"collab-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}",
            "channel": "SUBAGENTS",
            "senderCode": from_id.upper(),
            "senderName": from_name,
            "senderRole": from_id,
            "recipientCode": to_id.upper(),
            "recipientName": to_name,
            "recipientRole": to_id,
            "recipient": to_name,
            "timestamp": time.strftime("%H:%M:%S"),
            "content": msg_text,
            "thoughts": req.thoughts or req.thought,
            "critique": req.critique,
            "question": req.question,
            "report": req.report or req.fullReport,
        }
        conv["messages"].append(collab_msg)
        
    save_persisted_state()
    if collab_msg:
        await manager.broadcast({
            "type": "NEW_MESSAGE",
            "convId": cid,
            "message": collab_msg
        })
    await manager.broadcast({
        "type": "COLLABORATION_UPDATE",
        "convId": cid,
        "collaborations": collabs,
        "agents": conv["agents"],
        "messages": conv["messages"]
    })
    await manager.broadcast({
        "type": "AGENTS_UPDATE",
        "convId": cid,
        "agents": conv["agents"]
    })
    return {"status": "ok", "convId": cid, "collaborations": collabs, "message": collab_msg}


# --- Telemetry & Process Inspection Endpoints ---

@app.get("/api/telemetry")
def get_telemetry(convId: Optional[str] = Query(None)):
    cid = convId or active_conv_id
    if not project_matches(conversations_store.get(cid, {}), request_project_id.get()):
        raise HTTPException(status_code=403, detail="This session is not assigned to the active project.")
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    return conv["telemetry"]


class AntigravityToolEventRequest(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    convId: str = Field(min_length=1, max_length=200)
    tool: str = Field(min_length=1, max_length=120)
    status: str = Field(pattern="^(SUCCESS|ERROR)$")
    stepIdx: int = Field(ge=0)
    args: Optional[Dict[str, Any]] = None
    output: Optional[str] = None
    error: Optional[str] = None
    agentId: Optional[str] = None
    agentName: Optional[str] = None
    model_config = {"extra": "allow"}


@app.post("/api/telemetry/host_tool")
async def log_antigravity_tool_event(req: AntigravityToolEventRequest):
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    if conv.get("thinkTank", {}).get("status") in {"DISCONNECTED", "UNKNOWN", "IDLE"}:
        conv["thinkTank"]["status"] = "ACTIVE"

    telemetry = conv.setdefault("telemetry", {"toolCalls": [], "terminalLogs": [], "backgroundTasks": []})
    calls = telemetry.setdefault("toolCalls", [])
    previous = next((call for call in calls if call.get("id") == req.id), None)
    if previous:
        return {"status": "duplicate", "convId": cid, "entry": previous}

    entry = {
        "id": req.id,
        "agentId": req.agentId or "antigravity",
        "agentName": req.agentName or "Antigravity",
        "tool": req.tool.strip(),
        "args": req.args or {},
        "output": req.output or "",
        "error": req.error or "",
        "status": req.status,
        "latencyMs": None,
        "timestamp": time.strftime("%H:%M:%S"),
        "source": "antigravity-hook",
        "stepIdx": req.stepIdx,
    }
    calls.insert(0, entry)
    telemetry["toolCalls"] = calls[:50]

    # Update active agent tool state if agent identified
    ag_target = normalize_agent_id(req.agentId or "main_agent")
    agent_updated = False
    if ag_target and ag_target != "user":
        agent_updated = upsert_agent_state(
            conv,
            ag_target,
            name=req.agentName,
            tool=req.tool.strip(),
            status="ACTIVE",
        )

    save_persisted_state()
    await manager.broadcast({"type": "TELEMETRY_UPDATE", "convId": cid, "telemetry": telemetry})
    if agent_updated:
        await manager.broadcast({"type": "AGENTS_UPDATE", "convId": cid, "agents": conv["agents"]})
    return {"status": "ok", "convId": cid, "entry": entry}


class ToolCallLogRequest(BaseModel):
    id: Optional[str] = None
    agentId: str
    agentName: Optional[str] = None
    tool: str
    args: Optional[Dict[str, Any]] = None
    output: str
    status: str = "SUCCESS"
    latencyMs: Optional[int] = None
    convId: Optional[str] = None


@app.post("/api/telemetry/tool_call")
async def log_tool_call(req: ToolCallLogRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    
    call_id = req.id or f"tc-{int(time.time()*1000)}"
    entry = {
        "id": call_id,
        "agentId": req.agentId,
        "agentName": req.agentName or req.agentId,
        "tool": req.tool,
        "args": req.args or {},
        "output": req.output,
        "status": req.status,
        "latencyMs": req.latencyMs,
        "timestamp": time.strftime("%H:%M:%S")
    }
    telem = conv["telemetry"]
    telem.setdefault("toolCalls", []).insert(0, entry)
    if len(telem["toolCalls"]) > 50:
        telem["toolCalls"] = telem["toolCalls"][:50]

    ag_target = normalize_agent_id(req.agentId or "main_agent")
    agent_updated = False
    if ag_target and ag_target != "user":
        agent_updated = upsert_agent_state(
            conv,
            ag_target,
            name=req.agentName,
            tool=req.tool.strip(),
            status="ACTIVE",
        )

    save_persisted_state()
    await manager.broadcast({
        "type": "TELEMETRY_UPDATE",
        "convId": cid,
        "telemetry": telem
    })
    if agent_updated:
        await manager.broadcast({
            "type": "AGENTS_UPDATE",
            "convId": cid,
            "agents": conv["agents"]
        })
    return {"status": "ok", "entry": entry}


class TerminalLogRequest(BaseModel):
    id: Optional[str] = None
    agentId: str
    agentName: Optional[str] = None
    command: str
    output: str
    exitCode: int = 0
    convId: Optional[str] = None


@app.post("/api/telemetry/terminal_log")
async def log_terminal(req: TerminalLogRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    
    log_id = req.id or f"tl-{int(time.time()*1000)}"
    entry = {
        "id": log_id,
        "agentId": req.agentId,
        "agentName": req.agentName or req.agentId,
        "command": req.command,
        "output": req.output,
        "exitCode": req.exitCode,
        "timestamp": time.strftime("%H:%M:%S")
    }
    telem = conv["telemetry"]
    telem.setdefault("terminalLogs", []).insert(0, entry)
    if len(telem["terminalLogs"]) > 50:
        telem["terminalLogs"] = telem["terminalLogs"][:50]
    save_persisted_state()
    await manager.broadcast({
        "type": "TELEMETRY_UPDATE",
        "convId": cid,
        "telemetry": telem
    })
    return {"status": "ok", "entry": entry}


class TaskLogRequest(BaseModel):
    id: str
    agentId: str
    agentName: Optional[str] = None
    title: str
    command: str
    pid: Optional[int] = None
    status: str = "RUNNING"
    isDaemon: bool = False
    uptime: Optional[str] = "Active"
    convId: Optional[str] = None


@app.post("/api/telemetry/task")
async def log_task(req: TaskLogRequest):
    cid = require_conversation_id(req.convId)
    check_and_reload_state(cid)
    conv = get_or_create_conversation(cid)
    
    tasks = conv["telemetry"].setdefault("backgroundTasks", [])
    found = False
    for t in tasks:
        if t.get("id") == req.id:
            t["status"] = req.status
            t["command"] = req.command
            t["title"] = req.title
            if req.pid: t["pid"] = req.pid
            if req.uptime: t["uptime"] = req.uptime
            found = True
            break
    if not found:
        entry = {
            "id": req.id,
            "agentId": req.agentId,
            "agentName": req.agentName or req.agentId,
            "title": req.title,
            "command": req.command,
            "pid": req.pid,
            "status": req.status,
            "isDaemon": req.isDaemon,
            "uptime": req.uptime or "Active",
            "startedAt": time.strftime("%H:%M:%S")
        }
        tasks.insert(0, entry)
    save_persisted_state()
    await manager.broadcast({
        "type": "TELEMETRY_UPDATE",
        "convId": cid,
        "telemetry": conv["telemetry"]
    })
    return {"status": "ok", "tasks": tasks}


class ToolExecuteRequest(BaseModel):
    agentId: str
    command: str
    convId: Optional[str] = None


@app.post("/api/tools/execute")
async def execute_tool(req: ToolExecuteRequest):
    cid = require_conversation_id(req.convId)
    conv = get_or_create_conversation(cid)
    started = time.perf_counter()
    result = await asyncio.to_thread(execute_subagent_command, req.agentId, req.command)
    latency_ms = round((time.perf_counter() - started) * 1000)
    entry = {
        "id": str(uuid.uuid4()),
        "agentId": req.agentId,
        "agentName": next((a.get("name", req.agentId) for a in conv["agents"] if a.get("id") == req.agentId), req.agentId),
        "tool": req.command,
        "args": {},
        "output": result.get("output", ""),
        "status": "SUCCESS" if result.get("success") else "NOT_EXECUTED",
        "latencyMs": latency_ms,
        "timestamp": time.strftime("%H:%M:%S"),
    }
    calls = conv["telemetry"].setdefault("toolCalls", [])
    calls.insert(0, entry)
    del calls[50:]
    await manager.broadcast({"type": "TELEMETRY_UPDATE", "convId": cid, "telemetry": conv["telemetry"]})
    return {
        "status": "executed" if result.get("success") else "not_executed",
        "convId": cid,
        "latencyMs": latency_ms,
        **result,
    }


# Mount Static Files (Frontend SPA Build & Fonts)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8780, reload=False)
