import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Response, SidecarApp } from 'sidecar_sdk';
import { backendProjectHeaders } from './backend-headers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const app = new SidecarApp();
const API = 'http://127.0.0.1:8780/api';
const BACKEND_DIR = process.env.THINKTANK_BACKEND_DIR || join(
  process.env.USERPROFILE || process.env.HOME || homedir(),
  '.gemini', 'config', 'thinktank', 'backend',
);
let backendStartup = null;

const readLocal = (name) => readFileSync(join(HERE, name), 'utf8');

// 1. Root and Core Static Assets
const serveRoot = () => {
  let html = readLocal('index.html');
  const hostCid = app.config?.conversationId || '';
  const hostPid = app.config?.projectId || '';
  const injection = `<script>
    window.__ANTIGRAVITY_HOST_CONTEXT__ = {
      conversationId: ${JSON.stringify(hostCid)},
      projectId: ${JSON.stringify(hostPid)}
    };
    window.sidecar = Object.assign(window.sidecar || {}, {
      conversationId: ${JSON.stringify(hostCid)},
      projectId: ${JSON.stringify(hostPid)}
    });
  </script>`;
  return new Response(html.replace('</head>', `${injection}\n</head>`), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
};

app.page('/', serveRoot);
app.page('/index.html', serveRoot);

for (const [route, file, contentType] of [
  ['/app.css', 'app.css', 'text/css'],
  ['/roles.css', 'roles.css', 'text/css'],
  ['/tailwind.js', 'tailwind.js', 'application/javascript'],
  ['/fonts.css', 'fonts.css', 'text/css'],
  ['/i18n.js', 'i18n.js', 'application/javascript'],
  ['/activity.js', 'activity.js', 'application/javascript'],
  ['/app.js', 'app.js', 'application/javascript'],
  ['/conversation-context.mjs', 'conversation-context.mjs', 'application/javascript'],
  ['/ui-preferences.mjs', 'ui-preferences.mjs', 'application/javascript'],
]) {
  if (existsSync(join(HERE, file))) {
    const handler = () => new Response(readLocal(file), {
      contentType,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
    app.page(route, handler);
    app.page(`/think-tank${route}`, handler);
  }
}

// 2. Local Fonts
for (const [route, file] of [
  ['/fonts/Outfit-VariableFont_wght.ttf', 'fonts/Outfit-VariableFont_wght.ttf'],
  ['/fonts/Vazirmatn-Regular.ttf', 'fonts/Vazirmatn-Regular.ttf'],
  ['/fonts/Vazirmatn-Bold.ttf', 'fonts/Vazirmatn-Bold.ttf'],
  ['/assets/fonts/Vazirmatn-Regular.ttf', 'assets/fonts/Vazirmatn-Regular.ttf'],
  ['/assets/fonts/Vazirmatn-Bold.ttf', 'assets/fonts/Vazirmatn-Bold.ttf'],
  ['/assets/fonts/Outfit-VariableFont_wght.ttf', 'fonts/Outfit-VariableFont_wght.ttf'],
]) {
  if (existsSync(join(HERE, file))) {
    app.page(route, () => new Response(readFileSync(join(HERE, file)), {
      contentType: 'font/ttf',
      headers: {
        'Content-Type': 'font/ttf',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }));
  }
}

// 3. Assets & Avatars
const assetsDir = join(HERE, 'assets');
if (existsSync(assetsDir)) {
  for (const name of readdirSync(assetsDir)) {
    if (name.endsWith('.svg') || name.endsWith('.png') || name.endsWith('.ico')) {
      const file = join(assetsDir, name);
      const ct = name.endsWith('.svg') ? 'image/svg+xml' : (name.endsWith('.png') ? 'image/png' : 'image/x-icon');
      app.page(`/assets/${name}`, () => new Response(readFileSync(file), {
        contentType: ct,
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=86400',
        },
      }));
    }
  }
}
const avatarsDir = join(HERE, 'assets', 'avatars');
if (existsSync(avatarsDir)) {
  for (const name of readdirSync(avatarsDir)) {
    if (name.endsWith('.svg')) {
      const file = join(avatarsDir, name);
      app.page(`/assets/avatars/${name}`, () => new Response(readFileSync(file, 'utf8'), {
        contentType: 'image/svg+xml',
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
        },
      }));
    }
  }
}

// 4. Role Catalog
let roleCatalog = [];
const catalogPath = join(HERE, 'role_catalog.json');
if (existsSync(catalogPath)) {
  try {
    roleCatalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse role_catalog.json', err);
  }
}
app.api('/api/roles', () => ({ roles: roleCatalog }), 'GET');
app.api('/roles', () => ({ roles: roleCatalog }), 'GET');

// 5. Host Context
app.api('/api/host/context', () => ({
  conversationId: app.config.conversationId || null,
  projectId: app.config.projectId || null,
}), 'GET');

// 6. Backend Forwarding
async function forward(path, method, data) {
  try {
    const backend = await ensureBackendRunning();
    if (!backend.ok) return { status: 'offline', syncMode: 'disconnected', error: backend.error };
    const eventId = data?.eventId || crypto.randomUUID();
    const response = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...backendProjectHeaders(app.config.projectId),
        ...(data ? { 'Content-Type': 'application/json', 'X-ThinkTank-Event-Id': eventId } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(4000),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? body : {
      status: 'error',
      httpStatus: response.status,
      error: body.detail || body.error || `Backend returned HTTP ${response.status}`,
    };
  } catch (error) {
    return { status: 'offline', syncMode: 'disconnected', error: error.message };
  }
}

async function backendHealthy() {
  try {
    const response = await fetch(`${API}/status`, { signal: AbortSignal.timeout(700) });
    if (!response.ok) return false;
    const body = await response.json();
    return body.syncMode === 'durable-websocket' && Boolean(body.sync?.generation);
  } catch {
    return false;
  }
}

async function ensureBackendRunning() {
  if (await backendHealthy()) return { ok: true };
  if (['0', 'false', 'no'].includes(String(process.env.THINKTANK_AUTO_START || '1').toLowerCase())) {
    return { ok: false, error: 'Backend auto-start is disabled.' };
  }
  if (!existsSync(join(BACKEND_DIR, 'app.py'))) {
    return { ok: false, error: `ThinkTank backend was not found at ${BACKEND_DIR}.` };
  }
  if (!backendStartup) {
    backendStartup = (async () => {
      try {
        const python = process.env.THINKTANK_PYTHON || process.env.PYTHON || 'python';
        const child = spawn(python, [
          '-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8780',
        ], {
          cwd: BACKEND_DIR,
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          env: process.env,
        });
        child.on('error', () => {});
        child.unref();
      } catch (error) {
        return { ok: false, error: `Could not start ThinkTank backend: ${error.message}` };
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (await backendHealthy()) return { ok: true };
      }
      return { ok: false, error: 'ThinkTank backend did not become healthy on 127.0.0.1:8780.' };
    })().finally(() => { backendStartup = null; });
  }
  return backendStartup;
}

// 7. GET Endpoints
for (const endpoint of ['/status', '/conversations', '/telemetry']) {
  app.api(`/api${endpoint}`, async (data) => {
    const cid = data?.convId || (endpoint === '/status' ? (app.config?.conversationId || '') : '');
    const query = cid ? `?convId=${encodeURIComponent(cid)}` : '';
    return forward(`${endpoint}${query}`, 'GET');
  }, 'GET');
  app.api(endpoint, async (data) => {
    const cid = data?.convId || (endpoint === '/status' ? (app.config?.conversationId || '') : '');
    const query = cid ? `?convId=${encodeURIComponent(cid)}` : '';
    return forward(`${endpoint}${query}`, 'GET');
  }, 'GET');
}

// 8. Host Send Message
app.api('/api/host/send-message', async (data) => {
  const convId = String(data?.convId || '').trim();
  const prompt = String(data?.prompt || '').trim();
  if (!convId || convId === 'default') return { status: 'error', error: 'Active host conversation ID is unavailable.' };
  if (!prompt) return { status: 'error', error: 'Message cannot be empty.' };
  if (prompt.length > 4000) return { status: 'error', error: 'Message exceeds the 4000 character limit.' };
  try {
    const result = app.sendMessage(convId, prompt);
    if (result?.success === false || result?.status === 'error') {
      return { status: 'error', convId, error: String(result.error || result.message || 'Antigravity rejected the message.') };
    }
    return { status: 'sent', convId, hostResult: result };
  } catch (error) {
    const detail = String(error.message || 'Antigravity could not accept the message.').trim();
    return { status: 'error', convId, error: detail.slice(0, 1200) };
  }
}, 'POST');

// 9. Governance Review Decision Dispatch
app.api('/api/governance/review_decision', async (data) => {
  const convId = String(data?.convId || '').trim();
  const decision = String(data?.decision || '').trim();
  if (!convId || convId === 'default') return { status: 'error', error: 'Active host conversation ID is unavailable.' };
  if (!['continue', 'stop'].includes(decision)) return { status: 'error', error: 'Review decision must be continue or stop.' };
  const recorded = await forward('/governance/review_decision', 'POST', data);
  if (recorded.status === 'offline' || recorded.status === 'error') return recorded;
  const choice = decision === 'continue' ? 'ادامهٔ کار' : 'توقف کار';
  const prompt = `تصمیم قطعی کاربر در بازبینی اتاق فکر: ${choice}. این تصمیم را در همین گفتگوی میزبان اجرا کن. شناسهٔ نشست اتاق فکر ${JSON.stringify(convId)} است؛ همهٔ فرمان‌های thinktank_bridge.py را با --conv-id ${JSON.stringify(convId)} اجرا کن.`;
  try {
    const hostResult = app.sendMessage(convId, prompt);
    if (hostResult?.success === false || hostResult?.status === 'error') {
      throw new Error(String(hostResult.error || hostResult.message || 'Antigravity rejected the decision.'));
    }
    const delivery = await forward('/governance/review_decision_dispatch', 'POST', { convId, status: 'sent' });
    return { ...recorded, status: 'sent', review: delivery.review || recorded.review };
  } catch (error) {
    const detail = String(error.message || 'Antigravity could not accept the decision.').slice(0, 800);
    const delivery = await forward('/governance/review_decision_dispatch', 'POST', { convId, status: 'failed', error: detail });
    return { ...recorded, status: 'recorded_not_dispatched', error: detail, review: delivery.review || recorded.review };
  }
}, 'POST');

// 10. POST Endpoints
const postRoutes = [
  '/api/agent/update',
  '/api/agent/collaborate',
  '/api/task/update',
  '/api/subtasks/upsert',
  '/api/proposal/update',
  '/api/proposal/action',
  '/api/proposal/vote',
  '/api/chat/send',
  '/api/messages/send',
  '/api/governance/extend_rounds',
  '/api/governance/compress_final',
  '/api/governance/review_dispatch',
  '/api/governance/review_decision_dispatch',
  '/api/governance/submit_review',
  '/api/telemetry/tool_call',
  '/api/telemetry/terminal_log',
  '/api/telemetry/task',
];

for (const route of postRoutes) {
  const backendPath = route.replace('/api', '');
  app.api(route, (data) => forward(backendPath, 'POST', data || {}), 'POST');
  app.api(backendPath, (data) => forward(backendPath, 'POST', data || {}), 'POST');
}

app.api('/api/dispatch', (data) => forward('/tools/execute', 'POST', data || {}), 'POST');
app.api('/dispatch', (data) => forward('/tools/execute', 'POST', data || {}), 'POST');

app.run();
