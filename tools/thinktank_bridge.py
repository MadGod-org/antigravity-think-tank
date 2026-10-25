#!/usr/bin/env python3
"""
Think Tank Matrix — Live Bridge CLI
Allows any conversation, subagent or task runner to stream real tasks,
post proposals, present interactive options to the user, update active agent actions,
thoughts, demo snippets, and deliberation round governance.
"""

import sys
import os
import json
import time
import argparse
import urllib.request
import urllib.error
import subprocess
from bridge_transport import ensure_backend_running, api_post, api_get

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def report_result(label: str, result: dict):
    status = result.get("status")
    if status == "queued_offline":
        print(f"⏳ [Think Tank] Queued while backend is offline: {label} (event {result.get('eventId')})")
    elif status in {"error", "offline"} or result.get("success") is False:
        print(f"❌ [Think Tank] Not confirmed: {label} — {result.get('error', status)}")
    elif status == "duplicate":
        print(f"↩️ [Think Tank] Duplicate retry ignored: {label}")
    else:
        print(f"✅ [Think Tank] {label}")
    return result

def set_task(project: str, directive: str, phase: str = "Active Deliberation", progress: int = 50, round: int = None, max_rounds: int = None, conv_id: str = None):
    payload = {
        "project": project,
        "directive": directive,
        "status": "ACTIVE",
        "phase": phase,
        "progress": progress
    }
    if round is not None: payload["round"] = round
    if max_rounds is not None: payload["maxRounds"] = max_rounds
    res = api_post("task/update", payload, conv_id)
    return report_result(f"Task update submitted: [{project}] {directive}", res)


def set_proposal(proposal_id: str, project: str, title: str, author: str, summary: str, options: list = None, votes: list = None, conv_id: str = None):
    payload = {
        "id": proposal_id,
        "project": project,
        "title": title,
        "author": author,
        "summary": summary,
        "decisionOptions": options or [],
        "votes": votes or []
    }
    res = api_post("proposal/update", payload, conv_id)
    return report_result(f"Proposal update submitted: «{title}»", res)


def post_message(channel: str, sender_code: str, sender_name: str, sender_role: str, content: str, is_btw: bool = False, conv_id: str = None, is_review: bool = False, review_id: str = None, *, recipient_code: str = None, recipient_name: str = None, recipient_role: str = None, recipient: str = None, thoughts: str = None, critique: str = None, question: str = None, report: str = None):
    if is_review and not review_id:
        raise ValueError("--review-id is required for current review messages")
    payload = {
        "id": f"msg-{int(time.time() * 1000)}",
        "channel": channel,
        "senderCode": sender_code,
        "senderName": sender_name,
        "senderRole": sender_role,
        "timestamp": time.strftime("%H:%M:%S"),
        "content": content,
        "isBtw": is_btw,
        "isOperator": False,
        "isReview": is_review,
    }
    if is_review:
        payload["reviewId"] = review_id
    if recipient_code:
        payload["recipientCode"] = recipient_code
    if recipient_name:
        payload["recipientName"] = recipient_name
    if recipient_role:
        payload["recipientRole"] = recipient_role
    if recipient:
        payload["recipient"] = recipient
    if thoughts:
        payload["thoughts"] = thoughts
    if critique:
        payload["critique"] = critique
    if question:
        payload["question"] = question
    if report:
        payload["report"] = report
    res = api_post("chat/send", payload, conv_id)
    return report_result(f"Message submitted ({channel}) by {sender_name}", res)


def update_agent(agent_id: str, task: str = None, tool: str = None, thought: str = None, demo: str = None, status: str = None, latency: int = None, conv_id: str = None, *, name: str = None, role: str = None, code: str = None, icon: str = None, progress: int = None):
    clean_id = agent_id.replace("agent-", "").lower()
    payload = {"id": clean_id}
    if task: payload["task"] = task
    if tool: payload["tool"] = tool
    if thought: payload["thought"] = thought
    if demo: payload["demo"] = demo
    if status: payload["status"] = status
    if latency is not None: payload["latency"] = latency
    if name: payload["name"] = name
    if role: payload["role"] = role
    if code: payload["code"] = code
    if icon: payload["icon"] = icon
    if progress is not None: payload["progress"] = progress
    res = api_post("agent/update", payload, conv_id)
    return report_result(f"Agent [{clean_id}] update submitted", res)


def collaborate(from_agent: str, to_agent: str, label: str = "همکاری و مباحثه فعال", message: str = None, conv_id: str = None, *, thoughts: str = None, critique: str = None, question: str = None, report: str = None):
    from_clean = from_agent.replace("agent-", "").lower()
    to_clean = to_agent.replace("agent-", "").lower()
    payload = {
        "fromAgent": from_clean,
        "toAgent": to_clean,
        "label": label,
        "crosstalkMessage": message,
        "thoughts": thoughts,
        "critique": critique,
        "question": question,
        "report": report,
    }
    res = api_post("agent/collaborate", payload, conv_id)
    return report_result(f"Collaboration submitted: {from_clean} ↔ {to_clean} ({label})", res)


def log_tool(agent_id: str, tool: str, status: str = "SUCCESS", args_json: str = None, output: str = "", latency_ms: int = None, conv_id: str = None, *, agent_name: str = None):
    parsed_args = {}
    if args_json:
        try:
            parsed_args = json.loads(args_json)
        except Exception:
            parsed_args = {"raw": args_json}
    payload = {
        "agentId": agent_id,
        "agentName": agent_name or agent_id,
        "tool": tool,
        "args": parsed_args,
        "output": output,
        "status": status,
        "latencyMs": latency_ms,
    }
    res = api_post("telemetry/tool_call", payload, conv_id)
    return report_result(f"Tool call logged: {agent_id} -> {tool} ({status})", res)


def set_round(round_num: int, max_rounds: int = None, conv_id: str = None):
    payload = {
        "round": round_num,
    }
    if max_rounds is not None:
        payload["maxRounds"] = max_rounds
    res = api_post("task/update", payload, conv_id)
    label = f"Deliberation round submitted: {round_num}" + (f"/{max_rounds}" if max_rounds is not None else "")
    return report_result(label, res)


def set_role_caps(main: int = 50, manager: int = 50, subagents: int = 50, conv_id: str = None):
    res = api_post("task/update", {"roleCaps": {"main": main, "manager": manager, "subagents": subagents}}, conv_id)
    return report_result("Role conversation caps submitted", res)


def submit_review(review_id: str, manager_summary: str, main_summary: str, confidence: int, recommendation: str,
                  continue_reasons: list, completion_reasons: list, evidence: list, conv_id: str = None):
    payload = {
        "reviewId": review_id,
        "managerSummary": manager_summary,
        "mainSummary": main_summary,
        "confidence": confidence,
        "recommendation": recommendation,
        "continueReasons": continue_reasons,
        "completionReasons": completion_reasons,
        "evidence": evidence,
    }
    return report_result("Evidence-backed manager review submitted", api_post("governance/submit_review", payload, conv_id))


def request_round_extension(additional_rounds: int = 3, conv_id: str = None):
    payload = {"additionalRounds": additional_rounds}
    res = api_post("governance/extend_rounds", payload, conv_id)
    return report_result(f"Request for {additional_rounds} additional rounds submitted", res)


def compress_final_round(conv_id: str = None):
    payload = {}
    res = api_post("governance/compress_final", payload, conv_id)
    return report_result("Final-round compression submitted", res)


def wait_user_action(timeout_seconds: int = 300, poll_interval: float = 2.0, conv_id: str = None):
    print(f"⏳ [Think Tank] Waiting for user approval or option selection in the UI (timeout: {timeout_seconds}s)...")
    start = time.time()
    while time.time() - start < timeout_seconds:
        state = api_get("status", conv_id)
        if state and state.get("status") == "offline":
            print("❌ [Think Tank] Backend disconnected; no live user decision can be read.")
            return None
        rev = state.get("review") if state else None
        if isinstance(rev, dict) and rev.get("humanDecision"):
            decision = state["review"]["humanDecision"]
            print(f"🎯 [Think Tank] Human review decision received: {decision.get('decision')}")
            return decision
        if state and "proposal" in state:
            prop = state["proposal"]
            decision = prop.get("userDecision")
            status = prop.get("status")
            if decision or status in ["APPROVED", "REVISION_REQUESTED", "HALTED"]:
                print(f"🎯 [Think Tank] User action received: status={status}, decision={decision}")
                return decision or {"status": status}
        time.sleep(poll_interval)
    print("⚠️ [Think Tank] User action wait timed out.")
    return None


def complete_task(summary: str, conv_id: str = None):
    update = api_post("task/update", {
        "status": "COMPLETED",
        "phase": "اتمام گزارش‌شده پس از بازبینی",
    }, conv_id)
    report_result("Completion state submitted", update)
    if update.get("status") not in {"updated", "ok"}:
        return update
    message = post_message("MAIN", "ORCHESTRATOR", "Team Manager", "team-manager", f"🏁 [اتمام پس از بازبینی]: {summary}", conv_id=conv_id, is_review=False)
    return message


def assign_subtask(
    title: str,
    assignee: str,
    subtask_id: str = None,
    assignee_name: str = None,
    delegated_by: str = "team_manager",
    delegated_by_name: str = "مدیر تیم",
    status: str = "ASSIGNED",
    priority: str = "HIGH",
    deliverable: str = "",
    thoughts: str = None,
    report: str = None,
    dependencies: list = None,
    conv_id: str = None,
):
    payload = {
        "id": subtask_id,
        "title": title,
        "assignee": assignee,
        "assigneeName": assignee_name,
        "delegatedBy": delegated_by,
        "delegatedByName": delegated_by_name,
        "status": status,
        "priority": priority,
        "deliverable": deliverable or "",
        "thoughts": thoughts,
        "report": report,
        "dependencies": dependencies or [],
    }
    res = api_post("subtasks/upsert", payload, conv_id)
    report_result(f"Subtask [{title}] -> {assignee} ({status})", res)
    return res


def vote_proposal(
    voter: str,
    comment: str,
    voter_name: str = None,
    voter_role: str = None,
    stance: str = "APPROVE",
    confidence: int = 90,
    counter_argument: str = None,
    conv_id: str = None,
):
    payload = {
        "voter": voter,
        "voterName": voter_name,
        "voterRole": voter_role,
        "stance": stance,
        "confidence": confidence,
        "comment": comment,
        "counterArgument": counter_argument,
    }
    res = api_post("proposal/vote", payload, conv_id)
    report_result(f"Proposal vote [{voter}: {stance} ({confidence}%)]", res)
    return res


def halt_task(reason: str, conv_id: str = None):
    update = api_post("task/update", {
        "status": "HALTED",
        "phase": f"Session Halted: {reason}",
    }, conv_id)
    action = api_post("proposal/action", {
        "action": "halt",
        "comment": reason
    }, conv_id)
    report_result("Stop state submitted", update)
    report_result("Stop action submitted", action)
    return post_message("MAIN", "ORCHESTRATOR", "Team Manager", "team-manager", f"🛑 [توقف نشست]: {reason}", conv_id=conv_id, is_review=True)


def main():
    parser = argparse.ArgumentParser(description="Think Tank Matrix Bridge CLI")
    default_conv_id = os.environ.get("THINKTANK_CONVERSATION_ID") or os.environ.get("ANTIGRAVITY_CONVERSATION_ID")
    parser.add_argument("--conv-id", default=default_conv_id, help="Explicit Antigravity conversation ID")
    subparsers = parser.add_subparsers(dest="command")

    def add_conv_id_option(subparser):
        subparser.add_argument("--conv-id", dest="conv_id", default=argparse.SUPPRESS, help=argparse.SUPPRESS)

    p_task = subparsers.add_parser("set-task")
    p_task.add_argument("--project", required=True)
    p_task.add_argument("--directive", required=True)
    p_task.add_argument("--phase", default="Active Deliberation & Analysis")
    p_task.add_argument("--progress", type=int, default=30)
    p_task.add_argument("--round", type=int)
    p_task.add_argument("--max-rounds", type=int)
    add_conv_id_option(p_task)

    p_prop = subparsers.add_parser("set-proposal")
    p_prop.add_argument("--id", default="prop-" + str(int(time.time())))
    p_prop.add_argument("--project", required=True)
    p_prop.add_argument("--title", required=True)
    p_prop.add_argument("--author", default="Team Orchestrator")
    p_prop.add_argument("--summary", required=True)
    p_prop.add_argument("--options", help="Comma-separated options list")
    add_conv_id_option(p_prop)

    p_msg = subparsers.add_parser("post-message")
    p_msg.add_argument("--channel", default="MAIN", choices=["MAIN", "SUBAGENTS"])
    p_msg.add_argument("--code", default="ORCHESTRATOR")
    p_msg.add_argument("--name", "--sender", "--sender-name", dest="name", default="Team Manager")
    p_msg.add_argument("--role", "--sender-role", dest="role", default="team-manager")
    p_msg.add_argument("--to", "--recipient", dest="recipient", help="Recipient subagent name or code")
    p_msg.add_argument("--recipient-code")
    p_msg.add_argument("--recipient-name")
    p_msg.add_argument("--recipient-role")
    p_msg.add_argument("--thoughts", help="Internal thought process or reasoning")
    p_msg.add_argument("--critique", help="Scrutinized critique or counter-argument")
    p_msg.add_argument("--question", help="Clarification question or inquiry")
    p_msg.add_argument("--report", help="Full technical report or analysis payload")
    p_msg.add_argument("--content", "--message", dest="content", required=True)
    p_msg.add_argument("--is-btw", action="store_true")
    p_msg.add_argument("--review", action="store_true", help="Mark an actual manager/main completion-review message so it does not consume the work cap")
    p_msg.add_argument("--review-id", help="Current review request ID returned by compress-final")
    add_conv_id_option(p_msg)

    p_ag = subparsers.add_parser("update-agent")
    p_ag.add_argument("--id", required=True)
    p_ag.add_argument("--task")
    p_ag.add_argument("--tool")
    p_ag.add_argument("--thought")
    p_ag.add_argument("--demo")
    p_ag.add_argument("--name")
    p_ag.add_argument("--role")
    p_ag.add_argument("--code")
    p_ag.add_argument("--icon")
    p_ag.add_argument("--progress", type=int)
    p_ag.add_argument("--status")
    p_ag.add_argument("--latency", type=int)
    add_conv_id_option(p_ag)

    p_coll = subparsers.add_parser("collaborate")
    p_coll.add_argument("--from", "--from-agent", dest="from_agent", required=True)
    p_coll.add_argument("--to", "--to-agent", dest="to_agent", required=True)
    p_coll.add_argument("--label", "--topic", dest="label", default="همکاری و مباحثه فعال")
    p_coll.add_argument("--message", "--content", dest="message")
    p_coll.add_argument("--thoughts")
    p_coll.add_argument("--critique")
    p_coll.add_argument("--question")
    p_coll.add_argument("--report")
    add_conv_id_option(p_coll)

    p_tool = subparsers.add_parser("log-tool")
    p_tool.add_argument("--agent", required=True)
    p_tool.add_argument("--name")
    p_tool.add_argument("--tool", required=True)
    p_tool.add_argument("--status", choices=["SUCCESS", "ERROR"], default="SUCCESS")
    p_tool.add_argument("--args")
    p_tool.add_argument("--output", default="")
    p_tool.add_argument("--latency", type=int)
    add_conv_id_option(p_tool)

    p_round = subparsers.add_parser("set-round")
    p_round.add_argument("--round", type=int, required=True)
    p_round.add_argument("--max-rounds", type=int)
    add_conv_id_option(p_round)

    p_caps = subparsers.add_parser("set-caps")
    p_caps.add_argument("--main", type=int, default=50)
    p_caps.add_argument("--manager", type=int, default=50)
    p_caps.add_argument("--subagents", type=int, default=50)
    add_conv_id_option(p_caps)

    p_review = subparsers.add_parser("submit-review")
    p_review.add_argument("--review-id", required=True)
    p_review.add_argument("--manager-summary", required=True)
    p_review.add_argument("--main-summary", required=True)
    p_review.add_argument("--confidence", type=int, required=True)
    p_review.add_argument("--recommendation", choices=["continue", "complete"], required=True)
    p_review.add_argument("--continue-reasons", nargs="+", required=True)
    p_review.add_argument("--completion-reasons", nargs="+", required=True)
    p_review.add_argument("--evidence", nargs="+", required=True)
    add_conv_id_option(p_review)

    p_ext = subparsers.add_parser("request-round-extension")
    p_ext.add_argument("--requested", type=int, default=3)
    add_conv_id_option(p_ext)

    p_comp_final = subparsers.add_parser("compress-final")
    add_conv_id_option(p_comp_final)

    p_wait = subparsers.add_parser("wait-action")
    p_wait.add_argument("--timeout", type=int, default=300)
    add_conv_id_option(p_wait)

    p_comp = subparsers.add_parser("complete")
    p_comp.add_argument("--summary", required=True)
    add_conv_id_option(p_comp)

    p_halt = subparsers.add_parser("halt")
    p_halt.add_argument("--reason", required=True)
    add_conv_id_option(p_halt)

    for sub_cmd in ("assign-subtask", "update-subtask"):
        p_sub = subparsers.add_parser(sub_cmd)
        p_sub.add_argument("--id", dest="subtask_id")
        p_sub.add_argument("--title", required=True)
        p_sub.add_argument("--assignee", required=True)
        p_sub.add_argument("--assignee-name")
        p_sub.add_argument("--from", "--delegated-by", dest="delegated_by", default="team_manager")
        p_sub.add_argument("--delegated-by-name", default="مدیر تیم")
        p_sub.add_argument("--status", default="ASSIGNED", choices=["ASSIGNED", "IN_PROGRESS", "REVIEW", "IN_REVIEW", "COMPLETED", "DONE", "BLOCKED"])
        p_sub.add_argument("--priority", default="HIGH", choices=["CRITICAL", "HIGH", "NORMAL", "MEDIUM", "LOW"])
        p_sub.add_argument("--deliverable", default="")
        p_sub.add_argument("--thoughts", default=None)
        p_sub.add_argument("--report", default=None)
        p_sub.add_argument("--dependencies", nargs="*")
        add_conv_id_option(p_sub)

    p_vote = subparsers.add_parser("vote-proposal")
    p_vote.add_argument("--voter", "--voter-id", dest="voter", required=True)
    p_vote.add_argument("--name", "--voter-name", dest="voter_name")
    p_vote.add_argument("--role", "--voter-role", dest="voter_role")
    p_vote.add_argument("--stance", default="APPROVE", choices=["APPROVE", "CONDITIONAL", "CRITIQUE", "REJECT"])
    p_vote.add_argument("--confidence", type=int, default=90)
    p_vote.add_argument("--comment", required=True)
    p_vote.add_argument("--counter-argument")
    add_conv_id_option(p_vote)

    args = parser.parse_args()
    if args.command and (not args.conv_id or args.conv_id == "default"):
        parser.error("an explicit Antigravity conversation ID is required; pass --conv-id or set ANTIGRAVITY_CONVERSATION_ID")

    if args.command == "set-task":
        set_task(args.project, args.directive, args.phase, args.progress, args.round, args.max_rounds, args.conv_id)
    elif args.command == "set-proposal":
        opts = [{"id": f"opt-{i+1}", "label": opt.strip()} for i, opt in enumerate(args.options.split(","))] if args.options else []
        set_proposal(args.id, args.project, args.title, args.author, args.summary, opts, conv_id=args.conv_id)
    elif args.command == "post-message":
        if args.review and not args.review_id:
            parser.error("--review-id is required when --review is used")
        post_message(
            args.channel, args.code, args.name, args.role, args.content, args.is_btw,
            conv_id=args.conv_id, is_review=args.review, review_id=args.review_id,
            recipient_code=getattr(args, 'recipient_code', None),
            recipient_name=getattr(args, 'recipient_name', None),
            recipient_role=getattr(args, 'recipient_role', None),
            recipient=getattr(args, 'recipient', None),
            thoughts=getattr(args, 'thoughts', None),
            critique=getattr(args, 'critique', None),
            question=getattr(args, 'question', None),
            report=getattr(args, 'report', None),
        )
    elif args.command == "update-agent":
        update_agent(
            args.id, args.task, args.tool, args.thought, args.demo, args.status,
            args.latency, conv_id=args.conv_id, name=args.name, role=args.role,
            code=args.code, icon=args.icon, progress=args.progress,
        )
    elif args.command == "collaborate":
        collaborate(
            args.from_agent, args.to_agent, args.label, args.message, conv_id=args.conv_id,
            thoughts=getattr(args, 'thoughts', None),
            critique=getattr(args, 'critique', None),
            question=getattr(args, 'question', None),
            report=getattr(args, 'report', None),
        )
    elif args.command == "log-tool":
        log_tool(
            args.agent, args.tool, args.status, args.args, args.output, args.latency,
            args.conv_id, agent_name=args.name
        )
    elif args.command == "set-round":
        set_round(args.round, args.max_rounds, conv_id=args.conv_id)
    elif args.command == "set-caps":
        set_role_caps(args.main, args.manager, args.subagents, conv_id=args.conv_id)
    elif args.command == "submit-review":
        submit_review(args.review_id, args.manager_summary, args.main_summary, args.confidence, args.recommendation,
                      args.continue_reasons, args.completion_reasons, args.evidence, conv_id=args.conv_id)
    elif args.command == "request-round-extension":
        request_round_extension(args.requested, conv_id=args.conv_id)
    elif args.command == "compress-final":
        compress_final_round(conv_id=args.conv_id)
    elif args.command == "wait-action":
        print(json.dumps(wait_user_action(args.timeout, conv_id=args.conv_id), ensure_ascii=False))
    elif args.command == "complete":
        complete_task(args.summary, conv_id=args.conv_id)
    elif args.command == "halt":
        halt_task(args.reason, conv_id=args.conv_id)
    elif args.command in ("assign-subtask", "update-subtask"):
        assign_subtask(
            title=args.title,
            assignee=args.assignee,
            subtask_id=args.subtask_id,
            assignee_name=args.assignee_name,
            delegated_by=args.delegated_by,
            delegated_by_name=args.delegated_by_name,
            status=args.status,
            priority=args.priority,
            deliverable=args.deliverable,
            thoughts=getattr(args, 'thoughts', None),
            report=getattr(args, 'report', None),
            dependencies=args.dependencies,
            conv_id=args.conv_id,
        )
    elif args.command == "vote-proposal":
        vote_proposal(
            voter=args.voter,
            comment=args.comment,
            voter_name=args.voter_name,
            voter_role=args.voter_role,
            stance=args.stance,
            confidence=args.confidence,
            counter_argument=args.counter_argument,
            conv_id=args.conv_id,
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
