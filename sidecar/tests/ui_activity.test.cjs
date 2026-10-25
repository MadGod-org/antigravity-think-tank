const test = require('node:test');
const assert = require('node:assert/strict');
require('../activity.js');
const {
  statusLabel,
  toolTypeLabel,
  activityTitle,
  activityDetail,
  mergeActivityMessage,
  eventsForThread,
  coalesceActivityEvents,
} = globalThis.ThinkTankActivity;

test('maps Antigravity lifecycle values to clear Persian labels', () => {
  assert.equal(statusLabel('inProgress'), 'در حال اجرا');
  assert.equal(statusLabel('pendingInit'), 'در صف');
  assert.equal(statusLabel('completed'), 'تمام‌شده');
  assert.equal(statusLabel('errored'), 'ناموفق');
  assert.equal(statusLabel('mysteryState'), 'وضعیت دریافتی: mysteryState');
});

test('maps activity status and tool details to English when requested', () => {
  assert.equal(statusLabel('inProgress', 'en'), 'In progress');
  assert.equal(toolTypeLabel('mcpToolCall', 'en'), 'MCP tool call');
  const event = { kind: 'tool_activity', tool_type: 'mcpToolCall', tool_name: 'filesystem.read_file', status: 'completed' };
  assert.equal(activityTitle(event, 'en'), 'MCP tool call');
  assert.equal(activityDetail(event, 'Review', '', 'en'), 'Conversation: Review · Tool: filesystem.read_file · Status: Completed');
});

test('names real tool categories without inventing a tool name', () => {
  assert.equal(toolTypeLabel('commandExecution'), 'اجرای فرمان');
  assert.equal(toolTypeLabel('mcpToolCall'), 'فراخوانی ابزار MCP');
  assert.equal(toolTypeLabel('dynamicToolCall'), 'فراخوانی ابزار پویا');
  assert.equal(toolTypeLabel('collabToolCall'), 'تعامل با زیرعامل');
  assert.equal(toolTypeLabel('fileChange'), 'تغییر فایل');
});

test('activity cards show the actual tool identity and received status', () => {
  const event = {
    kind: 'tool_activity',
    tool_type: 'mcpToolCall',
    tool_name: 'filesystem.read_file',
    status: 'inProgress',
  };
  assert.equal(activityTitle(event), 'فراخوانی ابزار MCP');
  assert.equal(activityDetail(event), 'ابزار: filesystem.read_file · وضعیت: در حال اجرا');
  assert.equal(activityDetail(event, 'آزمون زنده'), 'گفت‌وگو: آزمون زنده · ابزار: filesystem.read_file · وضعیت: در حال اجرا');
});

test('collaboration cards identify the agent role and keep actual status', () => {
  const event = {
    kind: 'tool_activity',
    tool_type: 'collabToolCall',
    agent_type: 'بازبین امنیت',
    status: 'running',
  };
  assert.equal(activityTitle(event), 'تعامل با زیرعامل');
  assert.equal(activityDetail(event), 'به: بازبین امنیت · وضعیت: در حال اجرا');
});

test('describes delegation and messaging as distinct actions with readable participants', () => {
  const delegation = {
    kind: 'tool_activity', tool_type: 'collabToolCall', collab_action: 'spawn_agent',
    agent_type: 'security-reviewer', status: 'completed',
  };
  const message = { ...delegation, collab_action: 'send_input', agent_type: '' };
  assert.equal(activityTitle(delegation), 'سپردن کار به زیرعامل');
  assert.equal(activityTitle({ ...delegation, collab_action: '', tool_name: 'spawn_agent' }), 'سپردن کار به زیرعامل');
  assert.equal(activityDetail(delegation, 'هماهنگ‌کننده', 'بازبین امنیت'), 'از هماهنگ‌کننده · به: بازبین امنیت · وضعیت: تمام‌شده');
  assert.equal(activityTitle(message), 'ارسال پیام به زیرعامل');
  assert.equal(activityDetail(message, 'هماهنگ‌کننده', 'بازبین امنیت'), 'از هماهنگ‌کننده · به: بازبین امنیت · وضعیت: تمام‌شده');
});

test('conversation view includes only the selected agent thread', () => {
  const events = [
    { event: { kind: 'agent_message', thread_id: 'manager', text: 'واگذاری' } },
    { event: { kind: 'user_message', thread_id: 'worker', text: 'وظیفه' } },
    { event: { kind: 'agent_message', thread_id: 'worker', text: 'نتیجه' } },
  ];
  assert.deepEqual(eventsForThread(events, 'worker').map((entry) => entry.event.text), ['وظیفه', 'نتیجه']);
});

test('coalesces repeated lifecycle updates for one action and keeps the latest status', () => {
  const updates = [
    { event: { kind: 'tool_activity', thread_id: 'manager', item_id: 'call-1', status: 'running', agent_type: 'بازبین امنیت' }, receivedAt: 1 },
    { event: { kind: 'tool_activity', thread_id: 'manager', item_id: 'call-1', status: 'completed' }, receivedAt: 2 },
    { event: { kind: 'tool_activity', thread_id: 'manager', item_id: 'call-2', status: 'running' }, receivedAt: 3 },
  ];
  const merged = coalesceActivityEvents(updates);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].event.status, 'completed');
  assert.equal(merged[0].event.agent_type, 'بازبین امنیت');
  assert.equal(merged[0].receivedAt, 2);
});

test('coalesces streamed message fragments and replaces them with the completed message', () => {
  let message = null;
  for (const text of ['The ', 'same ', 'message']) {
    message = mergeActivityMessage(message, { kind: 'message_delta', text });
  }
  assert.deepEqual(message, { text: 'The same message', complete: false });
  message = mergeActivityMessage(message, { kind: 'agent_message', text: 'The same message' });
  assert.deepEqual(message, { text: 'The same message', complete: true });
  message = mergeActivityMessage(message, { kind: 'message_delta', text: ' late fragment' });
  assert.deepEqual(message, { text: 'The same message', complete: true });
});
