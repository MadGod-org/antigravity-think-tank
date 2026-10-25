"""Optional, explicitly configured project tool adapters for ThinkTank."""

import json
import os
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List


def configured_adapters() -> Dict[str, str]:
    """Read a local JSON map of adapter names to script paths; no project tools are bundled."""
    raw = os.environ.get("THINKTANK_TOOL_ADAPTERS", "{}")
    try:
        value = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}
    if not isinstance(value, dict):
        return {}
    return {str(name): str(path) for name, path in value.items() if name and path}


def run_python_tool(script_path: str, args: List[str], timeout: int = 25) -> Dict[str, Any]:
    """Run a configured Python adapter without invoking a shell."""
    path = Path(script_path).expanduser()
    if not path.is_absolute():
        return {"success": False, "error": "Adapter path must be absolute.", "output": ""}
    if not path.is_file():
        return {"success": False, "error": f"Configured adapter not found: {path}", "output": ""}
    try:
        proc = subprocess.run(
            [sys.executable, str(path), *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
            shell=False,
        )
        output = proc.stdout.strip()
        error_output = proc.stderr.strip()
        try:
            parsed_json = json.loads(output)
        except (TypeError, json.JSONDecodeError):
            parsed_json = None
        return {
            "success": proc.returncode == 0,
            "returncode": proc.returncode,
            "output": output if output else error_output,
            "error": error_output,
            "data": parsed_json,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Tool execution timed out after {timeout}s", "output": ""}
    except Exception as error:
        return {"success": False, "error": str(error), "output": ""}


def execute_subagent_command(agent_id: str, command: str) -> Dict[str, Any]:
    """Execute only an explicitly configured `adapter <name> ...` command."""
    base = {"agentId": agent_id, "command": command}
    try:
        parts = shlex.split(command, posix=(os.name != "nt"))
    except ValueError as error:
        return {**base, "success": False, "output": "", "error": f"Could not parse adapter arguments: {error}"}
    if len(parts) < 2 or parts[0].lower() != "adapter":
        return {
            **base,
            "success": False,
            "output": "",
            "error": "No matching configured adapter; command was not executed.",
        }

    name = parts[1]
    script_path = configured_adapters().get(name)
    if not script_path:
        return {
            **base,
            "success": False,
            "output": "",
            "error": f"Adapter '{name}' is not configured; command was not executed.",
        }
    result = run_python_tool(script_path, parts[2:])
    return {
        **base,
        "success": result["success"],
        "output": result["output"],
        "error": result["error"] if not result["success"] else None,
    }
