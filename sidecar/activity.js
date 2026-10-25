(function exposeActivityLabels(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ThinkTankActivity = api;
})(typeof window !== "undefined" ? window : globalThis, function createActivityLabels() {
  const statusLabels = {
    running: "در حال اجرا",
    inProgress: "در حال اجرا",
    started: "در حال اجرا",
    updated: "در حال اجرا",
    completed: "تمام‌شده",
    idle: "آماده",
    failed: "ناموفق",
    errored: "ناموفق",
    interrupted: "متوقف‌شده",
    shutdown: "متوقف‌شده",
    stopped: "متوقف‌شده",
    queued: "در صف",
    pendingInit: "در صف",
    pending_init: "در صف",
    unknown: "نامشخص",
  };

  const toolTypeLabels = {
    commandExecution: "اجرای فرمان",
    mcpToolCall: "فراخوانی ابزار MCP",
    dynamicToolCall: "فراخوانی ابزار پویا",
    collabToolCall: "تعامل با زیرعامل",
    collabAgentToolCall: "تعامل با زیرعامل",
    fileChange: "تغییر فایل",
  };

  const statusLabelsEn = {
    running: "In progress", inProgress: "In progress", started: "In progress", updated: "In progress",
    completed: "Completed", idle: "Ready", failed: "Failed", errored: "Failed", interrupted: "Interrupted",
    shutdown: "Stopped", stopped: "Stopped", queued: "Queued", pendingInit: "Queued", pending_init: "Queued", unknown: "Unknown",
  };
  const toolTypeLabelsEn = {
    commandExecution: "Command execution", mcpToolCall: "MCP tool call", dynamicToolCall: "Dynamic tool call",
    collabToolCall: "Subagent interaction", collabAgentToolCall: "Subagent interaction", fileChange: "File change",
  };

  function statusLabel(status, locale = "fa") {
    if (!status) return locale === "en" ? "Unknown" : "نامشخص";
    if (locale === "en") return statusLabelsEn[status] || `Received status: ${status}`;
    return statusLabels[status] || `وضعیت دریافتی: ${status}`;
  }

  function toolTypeLabel(type, locale = "fa") {
    if (!type) return locale === "en" ? "Tool activity" : "فعالیت ابزار";
    if (locale === "en") return toolTypeLabelsEn[type] || `Tool activity (${type})`;
    return toolTypeLabels[type] || `فعالیت ابزار (${type})`;
  }

  const collaborationActions = {
    spawn_agent: "سپردن کار به زیرعامل",
    send_input: "ارسال پیام به زیرعامل",
    wait: "بررسی وضعیت زیرعامل",
    close_agent: "پایان‌دادن به کار زیرعامل",
    resume_agent: "ازسرگیری کار زیرعامل",
  };
  const collaborationActionsEn = {
    spawn_agent: "Delegate work to subagent",
    send_input: "Send message to subagent",
    wait: "Check subagent status",
    close_agent: "Finish subagent task",
    resume_agent: "Resume subagent task",
  };

  function eventsForThread(entries, threadId) {
    if (!threadId) return [];
    return entries.filter(entry => (entry?.event || entry)?.thread_id === threadId);
  }

  function activityIdentity(event) {
    const threadId = event.thread_id || "unknown";
    if (event.item_id) return `${threadId}:item:${event.item_id}`;
    if (event.kind === "turn_status" && event.turn_id) return `${threadId}:turn:${event.turn_id}`;
    if (event.kind === "approval_required" && event.request_id) return `${threadId}:approval:${event.request_id}`;
    if (event.kind === "thread_created" && event.child_thread_id) return `${threadId}:thread:${event.child_thread_id}`;
    return "";
  }

  function coalesceActivityEvents(entries) {
    const result = [];
    const positions = new Map();
    for (const entry of entries) {
      const event = entry?.event || entry;
      if (!event || typeof event.kind !== "string") continue;
      const identity = activityIdentity(event);
      if (!identity || !positions.has(identity)) {
        if (identity) positions.set(identity, result.length);
        result.push(entry?.event ? { ...entry, event: { ...event } } : { event: { ...event } });
        continue;
      }
      const index = positions.get(identity);
      const previous = result[index];
      const mergedEvent = { ...previous.event };
      for (const [key, value] of Object.entries(event)) {
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value)) {
          if (value.length) mergedEvent[key] = value;
          continue;
        }
        if (typeof value === "object") {
          if (Object.keys(value).length) mergedEvent[key] = { ...(mergedEvent[key] || {}), ...value };
          continue;
        }
        mergedEvent[key] = value;
      }
      const merged = { ...previous, ...(entry?.event ? entry : {}), event: mergedEvent };
      result[index] = merged;
    }
    return result;
  }

  function activityTitle(event, locale = "fa") {
    if (["tool_activity", "file_activity"].includes(event.kind)) {
      if (event.tool_type === "collabToolCall" || event.tool_type === "collabAgentToolCall") {
        const actions = locale === "en" ? collaborationActionsEn : collaborationActions;
        const action = actions[event.collab_action] || actions[event.tool_name];
        if (action) return action;
      }
      return toolTypeLabel(event.tool_type, locale);
    }
    if (locale === "en") {
      if (event.kind === "turn_status") return "Agent turn status";
      if (event.kind === "thread_created") return "New conversation";
      if (event.kind === "approval_required") return "Approval requested";
      if (event.kind === "user_input_required") return "Your input is needed";
      if (["message_delta", "agent_message"].includes(event.kind)) return "Agent message";
      if (event.kind === "user_message") return "Your message";
      return "Live event";
    }
    if (event.kind === "turn_status") return "وضعیت نوبت عامل";
    if (event.kind === "thread_created") return "گفت‌وگوی تازه";
    if (event.kind === "approval_required") return "درخواست اجازه";
    if (event.kind === "user_input_required") return "پرسش از کاربر";
    if (["message_delta", "agent_message"].includes(event.kind)) return "پیام عامل";
    if (event.kind === "user_message") return "پیام شما";
    return "رویداد زنده";
  }

  function activityDetail(event, sourceLabel = "", targetLabel = "", locale = "fa") {
    let detail = "";
    if (["message_delta", "agent_message", "user_message"].includes(event.kind)) {
      detail = event.text || "";
    } else if (event.kind === "turn_status") {
      detail = locale === "en" ? `Status: ${statusLabel(event.status, locale)}` : `وضعیت: ${statusLabel(event.status, locale)}`;
    } else if (event.kind === "approval_required") {
      detail = event.command || event.reason || (locale === "en" ? "Think Tank is waiting for your decision." : "اتاق فکر منتظر تصمیم شماست.");
    } else if (event.kind === "user_input_required") {
      detail = locale === "en" ? "Think Tank needs your answer to continue." : "اتاق فکر برای ادامه پاسخ شما را می‌خواهد.";
    } else if (event.kind === "thread_created") {
      detail = event.title || (locale === "en" ? "A child conversation was created in this session." : "گفت‌وگوی فرعی در همین نشست ساخته شد.");
    } else if (["tool_activity", "file_activity"].includes(event.kind)) {
      if (event.tool_type === "collabToolCall" || event.tool_type === "collabAgentToolCall") {
        const target = targetLabel || event.agent_type || (locale === "en" ? "Subagent" : "زیرعامل");
        const childId = event.agent_thread_id || event.agent_thread_ids?.[0];
        const childStatus = childId && event.agent_statuses?.[childId];
        const status = childStatus || event.status;
        const participants = [sourceLabel ? (locale === "en" ? `From: ${sourceLabel}` : `از ${sourceLabel}`) : "", locale === "en" ? `To: ${target}` : `به: ${target}`].filter(Boolean);
        detail = `${participants.join(" · ")} · ${locale === "en" ? "Status" : "وضعیت"}: ${statusLabel(status, locale)}`;
        sourceLabel = "";
      } else {
        const identity = event.tool_name ? (locale === "en" ? `Tool: ${event.tool_name}` : `ابزار: ${event.tool_name}`) : (locale === "en" ? `Activity type: ${toolTypeLabel(event.tool_type, locale)}` : `نوع فعالیت: ${toolTypeLabel(event.tool_type, locale)}`);
        detail = `${identity} · ${locale === "en" ? "Status" : "وضعیت"}: ${statusLabel(event.status, locale)}`;
      }
    } else {
      detail = event.reason || event.title || "";
    }
    return sourceLabel && detail ? `${locale === "en" ? "Conversation" : "گفت‌وگو"}: ${sourceLabel} · ${detail}` : detail;
  }

  function mergeActivityMessage(current, event) {
    const previous = current && typeof current.text === "string"
      ? current
      : { text: "", complete: false };
    if (event.kind === "agent_message") {
      return { text: event.text || previous.text, complete: true };
    }
    if (event.kind !== "message_delta" || previous.complete) return previous;
    return { text: previous.text + (event.text || ""), complete: false };
  }

  return { statusLabel, toolTypeLabel, activityTitle, activityDetail, mergeActivityMessage, eventsForThread, coalesceActivityEvents };
});
