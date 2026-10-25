import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const fonts = await readFile(new URL('fonts.css', root), 'utf8');
const appCss = await readFile(new URL('app.css', root), 'utf8');
const appJs = await readFile(new URL('app.js', root), 'utf8');

test('UI loads fonts with bulletproof base64 data URIs and bundled file fallbacks', async () => {
  assert.ok(/href=["']\/?fonts\.css["']/i.test(html) || /href=["']\/?app\.css["']/i.test(html), 'index should load the local font stylesheet');
  assert.ok(!/data:font\//i.test(html), 'index should not embed font payloads into html');
  assert.ok(/font-family:\s*["']?Vazirmatn/i.test(fonts), 'stylesheet should register Vazirmatn');
  assert.ok(/font-family:\s*["']?Outfit/i.test(fonts), 'stylesheet should register Outfit');
  assert.ok(/font-display:\s*swap/i.test(fonts), 'fonts should not hide text while loading');
  assert.ok(/data:font\/ttf;base64,/i.test(fonts), 'fonts.css should embed base64 font data URIs for webview fallback');

  for (const file of ['Vazirmatn-Regular.ttf', 'Vazirmatn-Bold.ttf', 'Outfit-VariableFont_wght.ttf']) {
    const data = await readFile(new URL(`fonts/${file}`, root));
    assert.ok(data.length > 50_000, `${file} should be a bundled font asset`);
    assert.deepEqual([...data.subarray(0, 4)], [0, 1, 0, 0], `${file} should be a TrueType font`);
  }
});

test('UI includes keyboard focus, reduced-motion, and a scrollable narrow layout', () => {
  const combinedCss = html + appCss;
  assert.ok(/:focus-visible/.test(combinedCss), 'interactive controls should show keyboard focus');
  assert.ok(/prefers-reduced-motion:\s*reduce/i.test(combinedCss), 'motion should respect OS preference');
  assert.ok(/@media\s*\(max-width:\s*1180px\)/i.test(combinedCss), 'narrow layout rules should exist');
  assert.ok(/@media\s*\(max-width:\s*860px\)/i.test(combinedCss), 'tablet layout rules should exist');
  assert.ok(/@media\s*\(max-width:\s*620px\)/i.test(combinedCss), 'mobile layout rules should exist');
});

test('language and theme controls expose their selected state', () => {
  assert.ok(/id="language-toggle"/i.test(html), 'Language toggle control should exist');
  assert.ok(/id="theme-toggle"/i.test(html), 'Theme toggle control should exist');
  assert.ok(/btn\.setAttribute\('aria-pressed'/i.test(appJs), 'theme state should update in code');
  assert.ok(/classList\.add\('dark'\)/.test(appJs) && /classList\.remove\('dark'\)/.test(appJs), 'both theme states should be applied');
  assert.ok(/document\.documentElement\.lang/.test(appJs) && /document\.documentElement\.dir/.test(appJs), 'language toggle should update html attributes');
});

test('conversation and activity tabs keep accessible selection and keyboard navigation', () => {
  assert.ok(/class="primary-nav"/i.test(html), 'primary navigation should exist');
  for (const tab of ['overview', 'conversations', 'team', 'activity', 'settings']) {
    assert.ok(new RegExp(`data-tab="${tab}"`).test(html), `${tab} nav button should exist`);
  }
  assert.ok(/btn\.setAttribute\('aria-selected'/.test(appJs), 'tabs should update aria-selected');
  assert.ok(/e\.key === 'ArrowRight'/.test(appJs) && /e\.key === 'ArrowLeft'/.test(appJs), 'arrow keys should navigate tabs');
  assert.ok(/e\.key === 'Home'/.test(appJs) && /e\.key === 'End'/.test(appJs), 'home and end keys should navigate tabs');
});

test('static session and task examples do not name an unrelated customer project', () => {
  assert.ok(!/سامان سا|فروشگاه نمونه ب/i.test(html), 'default content should not expose an unrelated sample project');
  assert.ok(/data-theme="dark"/.test(html), 'Dark theme should be default');
  assert.ok(/chat-pane-empty/.test(appCss) || /sidebar-empty/.test(appCss), 'empty state styles should exist');
});

test('thread list uses thread-link styling and proposal contract matches backend', async () => {
  assert.ok(/thread-link/.test(appJs), 'conversation items should use thread-link classes');
  assert.ok(/action:\s*['"]select_option['"]/.test(appJs), 'proposal option clicks should send select_option action');
  assert.ok(/action:\s*['"]approve['"]/.test(appJs), 'proposal modal should support approve action');
  assert.ok(/action:\s*['"]request_revision['"]/.test(appJs), 'proposal modal should support request_revision action');
  assert.ok(/action:\s*['"]halt['"]/.test(appJs), 'proposal modal should support halt action');
  assert.ok(/needs-decision/.test(appJs), 'proposal banner should flag decision required');

  const sidecarJson = JSON.parse(await readFile(new URL('sidecar.json', root), 'utf8'));
  assert.ok(/Think Tank/i.test(sidecarJson.display_name), 'sidecar display_name should reflect Think Tank');
  assert.ok(!/Codex/i.test(sidecarJson.display_name), 'sidecar display_name should not contain Codex');
  assert.ok(!/Think Tank Matrix/i.test(sidecarJson.display_name), 'sidecar should not contain legacy Matrix name');
});

test('in-chat decision card, newest-first message order, subagent thoughts, live badges, and flicker elimination', () => {
  // 1. In-chat Decision card
  assert.ok(/createChatDecisionCard/.test(appJs), 'chat stream should create interactive decision card');
  assert.ok(/chat-decision-card/.test(appCss) && /chat-decision-card/.test(appJs), 'decision card CSS and JS contracts should match');
  assert.ok(/decision-option-btn/.test(appCss) && /decision-option-btn/.test(appJs), 'decision options should be clickable buttons');

  // 2. Newest-first ordering (descending)
  assert.ok(/\[\.\.\.state\.messages\]\.reverse\(\)/.test(appJs), 'chat messages should render newest first (descending)');
  assert.ok(/allActions\s*=\s*\[/.test(appJs) && /\.reverse\(\)/.test(appJs), 'actions log should render newest first');

  // 3. Subagent thoughts, critiques & questions
  assert.ok(/thought-card/.test(appCss) && /thought-card/.test(appJs), 'subagent thoughts should be rendered in dedicated cards');
  assert.ok(/critique-card/.test(appCss) && /critique-card/.test(appJs), 'subagent critiques should be rendered in dedicated cards');
  assert.ok(/question-card/.test(appCss) && /question-card/.test(appJs), 'subagent questions should be rendered in dedicated cards');

  // 4. Team live badges & direct chat
  assert.ok(/live-pulse-dot/.test(appCss) && /live-pulse-dot/.test(appJs), 'active agents should have live pulse indicator');
  assert.ok(/agent-chat-btn/.test(appCss) && /agent-chat-btn/.test(appJs), 'team cards should provide direct chat button');

  // 5. Flicker prevention & signature diffing
  assert.ok(/signatures\s*=\s*\{/.test(appJs), 'app.js should maintain render signatures for diffing');
  assert.ok(!/\.message-row\s*\{[^}]*animation:\s*message-in/i.test(appCss), 'message rows should not re-animate on periodic poll');

  // 6. Typography & font inheritance
  assert.ok(/font-family:\s*['"]Vazirmatn['"][^;]*!important/i.test(appCss), 'typography must enforce Vazirmatn globally with !important');
});

test('static asset headers and genuine subagents contract', async () => {
  const mainMjs = await readFile(new URL('main.mjs', root), 'utf8');
  assert.ok(/'Content-Type':\s*['"]font\/ttf['"]/i.test(mainMjs), 'main.mjs should set Content-Type: font/ttf header for fonts');
  assert.ok(/'Content-Type':\s*contentType/i.test(mainMjs), 'main.mjs should set Content-Type header for static files');

  const roles = JSON.parse(await readFile(new URL('role_catalog.json', root), 'utf8'));
  const requiredRoleIdentifiers = [
    'manager',
    'designer_solver',
    'wp_technical_operator',
    'ecommerce_seo_operator',
    'code_reviewer',
    'qa_reviewer',
    'council_architect',
    'council_critic',
    'integration_reviewer',
    'firestore_rules_author',
    'data_intelligence_curator',
    'evidence_critical_reviewer',
    'requirements_auditor',
    'context_memory_curator',
    'performance_cost_analyst',
  ];

  for (const roleId of requiredRoleIdentifiers) {
    const found = roles.some((r) => r.id === roleId || (r.aliases && r.aliases.includes(roleId.replace(/_/g, '-'))));
    assert.ok(found, `role_catalog.json must include genuine ecosystem subagent ${roleId}`);
  }

  assert.ok(/<conversation-id>/.test(appJs), 'app.js fallback active conversation should be <conversation-id>');
  assert.ok(/'Content-Type':\s*['"]text\/html;\s*charset=utf-8['"]/i.test(mainMjs), 'main.mjs should set Content-Type: text/html on root route');
});

test('chronological ordering, prompt cancellation safety, and LTR font fallback', () => {
  // Chronological event sorting across actions & activity
  assert.ok(/getEventTimeValue/.test(appJs), 'app.js should have getEventTimeValue helper for accurate timestamp sorting');
  assert.ok(/allActions\s*=\s*\[[\s\S]*?_sortKey[\s\S]*?\.sort\([\s\S]*?\)\.reverse\(\)/.test(appJs), 'allActions should interleave tools and logs by _sortKey and reverse');
  assert.ok(/events\.sort\(\(a,\s*b\)\s*=>\s*a\._sortKey\s*-\s*b\._sortKey\)/.test(appJs), 'renderActivity should sort events chronologically before reversing');
  assert.ok(/sortedItems\s*=\s*\[\.\.\.items\]\.sort\([\s\S]*?getEventTimeValue/.test(appJs), 'thread rail items should be sorted chronologically by recency');

  // Decision card cancel protection
  assert.ok(/if\s*\(comment\s*===\s*null\)\s*return;/.test(appJs), 'revision prompt cancellation must guard against sending action on Cancel');

  // LTR font fallback contains Vazirmatn
  assert.ok(/font-family:\s*['"]Outfit['"],\s*['"]Vazirmatn['"]/.test(appCss), 'LTR CSS must include Vazirmatn in font fallback stack');

  // Working badge text
  assert.ok(/\${t\('در حال اجرا'\)}/.test(appJs), 'live agent pulse badge should use t("در حال اجرا")');
});

test('work breakdown subtasks board, council consensus matrix, and deliberation bar contracts', () => {
  assert.ok(/id="overview-subtasks-panel"/.test(html), 'Overview must include the subtasks WBS board');
  assert.ok(/data-chat-view="subtasks"/.test(html), 'Conversations tab must include the subtasks view switch');
  assert.ok(/id="composer-orchestration-bar"/.test(html), 'Composer must include the target & deliberation mode bar');
  assert.ok(/function renderSubtasks\(/.test(appJs), 'app.js must implement renderSubtasks');
  assert.ok(/council-consensus-box/.test(appJs), 'createChatDecisionCard must render the council consensus matrix');
  assert.ok(/agent-assign-btn/.test(appJs), 'Team cards must include a direct subtask assignment button');
  assert.ok(/\.subtask-card/.test(appCss), 'app.css must style subtask cards');
  assert.ok(/\.council-vote-card/.test(appCss), 'app.css must style council vote cards');
});

test('collapsible drawers for thoughts/reports, live chat working strip, and completed card option hiding', () => {
  assert.ok(/id="chat-live-activity-strip"/.test(html), 'Chatroom must include the live working & thinking strip');
  assert.ok(/function buildDrawerHtml\(/.test(appJs), 'app.js must implement buildDrawerHtml for collapsible drawers');
  assert.ok(/details\.tt-drawer/.test(appCss), 'app.css must style collapsible <details class="tt-drawer"> drawers');
  assert.ok(/report-card/.test(appJs) && /report-card/.test(appCss), 'Full reports must be rendered inside collapsible report-card drawers');
  assert.ok(/completed-team-roster/.test(appJs) && /completed-team-roster/.test(appCss), 'Completed decision cards must display participating subagents roster');
  assert.ok(/isCompleted\s*\?\s*''\s*:\s*`<div class="decision-options"/.test(appJs), 'Completed decision cards must omit selectable radio options');
});




