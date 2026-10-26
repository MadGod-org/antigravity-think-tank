(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const I18N = window.ThinkTankI18n || {
    getLanguage: () => 'fa',
    setLanguage: () => {},
    applyLanguage: () => {},
    translate: (k) => k,
    formatNumber: (n) => String(n),
    roleText: (r, f) => r[f] || '',
    skillNames: {},
  };

  const ActivityHelper = window.ThinkTankActivity || {
    statusLabel: (s) => s || 'نامشخص',
    toolTypeLabel: (t) => t || 'ابزار',
    activityTitle: (e) => e?.kind || 'رویداد',
    activityDetail: () => '',
  };

  const t = (text) => I18N.translate(text, state.language);
  const num = (n) => I18N.formatNumber(n, state.language);

  // Global Application State
  const state = {
    activeConvId: null,
    hostConvId: null,
    threadSearchQuery: '',
    project: '',
    phase: 'اتاق فکر فعال',
    round: 1,
    maxRounds: 50,
    progress: 0,
    directive: '',
    status: 'ACTIVE',
    conversations: [],
    agents: [],
    messages: [],
    telemetry: { toolCalls: [], terminalLogs: [], backgroundTasks: [] },
    collaborations: [],
    subtasks: [],
    proposal: null,
    review: null,
    roles: [],
    roleCategory: 'all',
    chatView: 'messages', // 'messages' | 'subtasks' | 'actions'
    composerMode: 'message', // 'message' | 'delegate' | 'critique' | 'question' | 'vote'
    composerTarget: '',
    activeTab: 'overview',
    connected: false,
    connectionMessage: '',
    theme: localStorage.getItem('thinktank-theme') || localStorage.getItem('thinktank.theme') || 'dark',
    language: I18N.getLanguage ? I18N.getLanguage() : 'fa',
    selectedProposalOption: null,
    ws: null,
    reconnectTimer: null,
    pollTimer: null,
    pingTimer: null,
    toastTimer: null,
  };

  // Rendering Signatures Cache for State Diffing & Flicker Prevention
  const signatures = {
    chat: '',
    chatActivity: '',
    subtasks: '',
    team: '',
    activity: '',
    rail: '',
    settings: '',
    overview: '',
    hostContext: '',
    modal: '',
  };

  const categoryLabels = {
    all: 'همهٔ نقش‌ها',
    core: 'هستهٔ اتاق فکر',
    engineering: 'طراحی و مهندسی',
    quality: 'بازبینی و کیفیت',
    specialist: 'تخصص‌های تکمیلی',
  };

  const skillLabels = {
    'accessibility-qa': 'دسترس‌پذیری',
    'agent-evaluation': 'ارزیابی عامل',
    'agent-output-scoring': 'امتیازدهی خروجی عامل',
    'agents-sdk': 'Agents SDK',
    'backend-quality': 'کیفیت بک‌اند',
    'browser-check': 'بررسی مرورگر',
    'context-budget': 'مدیریت کانتکست',
    'context-cost-control': 'کنترل کانتکست و هزینه',
    'dark-mode-visuals': 'طراحی پوسته تیره',
    'data-intake-tiering': 'طبقه‌بندی و پذیرش داده',
    'design-director': 'مدیریت دیزاین',
    'design-handoff': 'هندآف دیزاین',
    'design-to-code': 'طرح به کد',
    'design-tokens': 'توکن‌های دیزاین',
    'evidence-verification': 'راستی‌آزمایی شواهد',
    'frontend-quality': 'کیفیت فرانت‌اند',
    'ios-inspired-components': 'کنترل‌های لمسی',
    'microinteractions': 'میکروتعامل‌ها',
    'motion-design': 'موشن دیزاین',
    'motion-harness': 'هارنس انیمیشن',
    'requirements-traceability': 'ردیابی نیازمندی‌ها',
    'responsive-layout': 'طراحی واکنش‌گرا',
    'skill-coaching': 'مربی مهارت',
    'task-orchestration': 'سازمان‌دهی کارها',
    'task-router': 'مسیریابی کارها',
    'web-perf': 'کارایی وب',
    'woocommerce-technical-operator': 'عملیات ووکامرس',
    'wp-commerce-director': 'مدیریت تجارت الکترونیک',
    'wp-operations-safe': 'عملیات ایمن وردپرس',
    'wp-security-guardian': 'امنیت وردپرس',
    'wp-seo-auditor': 'ممیزی سئو',
    'wp-seo-editor': 'ویرایشگر سئو',
  };

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = t(message);
    el.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  let disconnectGraceTimer = null;
  let consecutivePollFailures = 0;

  function setConnection(connected, message = '') {
    if (connected) {
      consecutivePollFailures = 0;
      clearTimeout(disconnectGraceTimer);
      disconnectGraceTimer = null;
      state.connected = true;
      state.connectionMessage = '';
      const dot = $('#connection-dot');
      if (dot) dot.classList.add('connected');
      const rdot = $('.runtime-dot');
      if (rdot) rdot.classList.add('connected');
      const label = $('#connection-label');
      if (label) label.textContent = t('متصل به Antigravity (زنده)');
      const ov = $('#overview-connection');
      if (ov) ov.textContent = t('متصل به موتور آنتی‌گرویتی');
      const alert = $('#connection-alert');
      if (alert) {
        alert.classList.add('hidden');
        alert.textContent = '';
      }
      return;
    }

    if (!disconnectGraceTimer && state.connected) {
      disconnectGraceTimer = setTimeout(() => {
        state.connected = false;
        state.connectionMessage = message;
        const dot = $('#connection-dot');
        if (dot) dot.classList.remove('connected');
        const rdot = $('.runtime-dot');
        if (rdot) rdot.classList.remove('connected');
        const label = $('#connection-label');
        if (label) label.textContent = t('اتصال برقرار نیست');
        const ov = $('#overview-connection');
        if (ov) ov.textContent = t('در انتظار اتصال');
        const alert = $('#connection-alert');
        if (alert) {
          alert.textContent = message || t('سرویس پایتون روی پورت ۸۷۸۰ در دسترس نیست. در حال تلاش مجدد…');
          alert.classList.remove('hidden');
        }
      }, 6000);
    }
  }

  function applyTheme(theme) {
    const chosen = theme === 'light' ? 'light' : 'dark';
    state.theme = chosen;
    document.documentElement.dataset.theme = chosen;
    if (chosen === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('thinktank-theme', chosen);
    localStorage.setItem('thinktank.theme', chosen);
    const btn = $('#theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', t(chosen === 'dark' ? 'تغییر پوسته به روشن' : 'تغییر پوسته به تیره'));
      btn.setAttribute('aria-pressed', chosen === 'dark' ? 'true' : 'false');
      btn.textContent = chosen === 'dark' ? '☼' : '◐';
    }
  }

  function setLanguage(lang) {
    state.language = lang === 'en' ? 'en' : 'fa';
    if (I18N.setLanguage) I18N.setLanguage(state.language);
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === 'en' ? 'ltr' : 'rtl';

    const btnFa = $('#lang-fa');
    const btnEn = $('#lang-en');
    if (btnFa) btnFa.setAttribute('aria-pressed', state.language === 'fa' ? 'true' : 'false');
    if (btnEn) btnEn.setAttribute('aria-pressed', state.language === 'en' ? 'true' : 'false');

    const toggle = $('#language-toggle');
    if (toggle) toggle.textContent = state.language === 'en' ? 'فارسی' : 'English';

    // Clear signature cache so everything re-translates properly
    for (const k in signatures) signatures[k] = '';
    refreshUI();
  }

  function setTab(name) {
    state.activeTab = name;
    $$('.primary-nav .nav-item').forEach((btn) => {
      const isCurrent = btn.dataset.tab === name;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });
    $$('.tab-panel').forEach((panel) => {
      const isCurrent = panel.id === `tab-${name}`;
      panel.hidden = !isCurrent;
      panel.classList.toggle('active', isCurrent);
    });
    const breadcrumb = $('#breadcrumb-current');
    if (breadcrumb) {
      const labels = {
        overview: 'نمای کلی',
        conversations: 'گفت‌وگوها',
        team: 'اعضای تیم',
        activity: 'جریان کار',
        settings: 'تنظیمات',
      };
      breadcrumb.textContent = t(labels[name] || 'نمای کلی');
    }
  }

  function findMatchingRole(roleIdentifier) {
    if (!roleIdentifier || !state.roles.length) return null;
    const clean = String(roleIdentifier).toLowerCase().replace(/[-_]/g, '');
    return state.roles.find((r) => {
      const rId = String(r.id || '').toLowerCase().replace(/[-_]/g, '');
      const rName = String(r.agent_name || '').toLowerCase().replace(/[-_]/g, '');
      const rTitle = String(r.title || '').toLowerCase().replace(/[-_]/g, '');
      const aliases = (r.aliases || []).map((a) => String(a).toLowerCase().replace(/[-_]/g, ''));
      return rId === clean || rName === clean || rTitle === clean || aliases.includes(clean);
    }) || null;
  }

  function getAvatarUrl(roleId) {
    const role = findMatchingRole(roleId);
    if (role && role.avatar) return `/assets/avatars/${role.avatar}`;
    return '/assets/avatars/role-main-agent.svg';
  }

  function renderHostContext() {
    const sig = `${state.activeConvId}:${state.project}:${state.directive}:${state.phase}`;
    if (sig === signatures.hostContext) return;
    signatures.hostContext = sig;

    const titleEl = $('#host-thread-context-title');
    const idEl = $('#host-thread-context-id');
    const refTitle = $('#host-thread-reference-title');
    const refId = $('#host-thread-reference-id');

    const displayTitle = state.project ? `${state.project} · ${state.directive || state.phase || t('اتاق فکر')}` : t('در انتظار دریافت عنوان نشست');
    const displayId = state.activeConvId || '#—';

    if (titleEl) titleEl.textContent = displayTitle;
    if (idEl) idEl.textContent = `${t('شناسهٔ گفت‌وگوی میزبان')}: ${displayId}`;
    if (refTitle) refTitle.textContent = displayTitle;
    if (refId) refId.textContent = displayId;

    const banner = $('#host-thread-context');
    if (banner) banner.classList.remove('hidden');
    const refBanner = $('#host-thread-reference');
    if (refBanner) refBanner.classList.remove('hidden');
  }

  function renderOverview() {
    const activeAgentsCount = state.agents.filter((a) => String(a.status).toUpperCase() === 'ACTIVE' || String(a.status).toUpperCase() === 'RUNNING').length;
    const totalEvents = state.messages.length + (state.telemetry.toolCalls || []).length + (state.telemetry.terminalLogs || []).length;
    const threadsCount = state.conversations.length || (state.activeConvId ? 1 : 0);

    const sig = `${threadsCount}:${activeAgentsCount}:${totalEvents}:${state.maxRounds}`;
    if (sig === signatures.overview) return;
    signatures.overview = sig;

    const mThreads = $('#metric-threads');
    if (mThreads) mThreads.textContent = num(threadsCount);

    const mAgents = $('#metric-agents');
    if (mAgents) mAgents.textContent = num(activeAgentsCount);

    const mEvents = $('#metric-events');
    if (mEvents) mEvents.textContent = num(totalEvents);

    const mRounds = $('#metric-rounds');
    if (mRounds) mRounds.textContent = num(state.maxRounds || 50);

    const form = $('#create-thread-form');
    if (form && !form.dataset.initialized) {
      form.dataset.initialized = 'true';
      if (state.project && form.elements.title) form.elements.title.value = state.project;
      if (state.directive && form.elements.task) form.elements.task.value = state.directive;
    }
  }

  function getEventTimeValue(item, fallbackIndex = 0) {
    if (!item) return fallbackIndex;
    if (typeof item.timestamp === 'number') return item.timestamp;
    if (typeof item.time === 'number') return item.time;
    if (typeof item.updated_at === 'number') return item.updated_at;
    if (typeof item.createdAt === 'number') return item.createdAt;

    if (typeof item.id === 'string') {
      const match = item.id.match(/\d{11,14}/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val > 1000000000000) return val;
      }
    }

    const raw = item.timestamp || item.time || item.updated_at || '';
    if (raw) {
      const parsed = Date.parse(raw);
      if (!isNaN(parsed) && !/^\d{1,2}:\d{2}/.test(raw)) {
        return parsed;
      }
      const parts = String(raw).split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        const s = parseInt(parts[2], 10) || 0;
        const d = new Date();
        d.setHours(h, m, s, 0);
        return d.getTime() + (fallbackIndex % 1000);
      }
    }

    return fallbackIndex;
  }

  function renderConversationsRail() {
    const items = state.conversations.length ? state.conversations : (state.activeConvId ? [{
      id: state.activeConvId,
      isCurrent: true,
      project: state.project || 'مکالمه جاری',
      directive: state.directive || 'در حال آماده‌سازی و تحلیل',
      status: state.status || 'ACTIVE',
    }] : []);

    const topbarLabel = $('#topbar-project-label');
    if (topbarLabel) {
      topbarLabel.textContent = state.project || (state.activeConvId === state.hostConvId ? t('مکالمه جاری') : t('پروژه فعال'));
    }

    const query = String(state.threadSearchQuery || '').trim().toLowerCase();
    const sig = `${state.activeConvId}:${state.hostConvId}:${query}:${items.length}:${items.map((c) => `${c.id}:${c.status}:${c.project}`).join('|')}`;
    if (sig === signatures.rail) return;
    signatures.rail = sig;

    const list = $('#conversation-rail-list');
    const sidebarList = $('#thread-list');
    const projectPickerList = $('#project-picker-list');
    const countEl = $('#rail-count');
    const threadCountEl = $('#thread-count');

    if (countEl) countEl.textContent = num(items.length);
    if (threadCountEl) threadCountEl.textContent = num(items.length);

    // Newest / selected thread first at the top (descending chronological order)
    const sortedItems = [...items].sort((a, b) => {
      if (a.id === state.activeConvId) return -1;
      if (b.id === state.activeConvId) return 1;
      if (a.isCurrent || a.id === state.hostConvId) return -1;
      if (b.isCurrent || b.id === state.hostConvId) return 1;
      const tA = getEventTimeValue(a, 0);
      const tB = getEventTimeValue(b, 0);
      return tB - tA;
    });

    const displayItems = query ? sortedItems.filter((conv) => {
      const matchP = String(conv.project || '').toLowerCase().includes(query);
      const matchD = String(conv.directive || '').toLowerCase().includes(query);
      const matchS = String(conv.status || '').toLowerCase().includes(query);
      const matchId = String(conv.id || '').toLowerCase().includes(query);
      return matchP || matchD || matchS || matchId;
    }) : sortedItems;

    const renderListInto = (container) => {
      if (!container) return;
      container.replaceChildren();
      if (!displayItems.length) {
        const empty = document.createElement('div');
        empty.className = 'sidebar-empty';
        empty.textContent = query ? t('موردی با این عبارت یافت نشد') : t('در انتظار دریافت عنوان نشست');
        container.append(empty);
        return;
      }
      for (const conv of displayItems) {
        const isSelected = conv.id === state.activeConvId;
        const isHostCurrent = Boolean(conv.isCurrent || conv.id === state.hostConvId);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `thread-link${isSelected ? ' selected' : ''}${isHostCurrent ? ' host-current' : ''}`;
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.dataset.convId = conv.id;
        const glyph = isSelected ? '●' : (isHostCurrent ? '🎯' : '▤');
        const title = escapeHtml(conv.project || conv.title || (isHostCurrent ? t('مکالمه جاری') : 'گفت‌وگو'));
        const snippet = escapeHtml(conv.directive || conv.task || ActivityHelper.statusLabel(conv.status, state.language));
        const statusLabel = escapeHtml(ActivityHelper.statusLabel(conv.status, state.language));
        const currentBadge = isHostCurrent ? `<span class="rail-current-badge">${escapeHtml(t('مکالمه جاری'))}</span>` : '';
        const statusTag = `<span class="rail-status-tag ${String(conv.status || 'ACTIVE').toLowerCase()}">${statusLabel}</span>`;
        btn.innerHTML = `
          <span class="thread-glyph">${glyph}</span>
          <span style="display:block;min-width:0;width:100%;">
            <span class="thread-title-row" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;max-width:65%;">${title}</strong>
              <span>${currentBadge}${statusTag}</span>
            </span>
            <small style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">${snippet}</small>
          </span>
        `;
        btn.addEventListener('click', () => {
          switchConversation(conv.id);
          const pDrop = $('#project-picker-dropdown');
          if (pDrop) pDrop.classList.add('hidden');
          const pChip = $('#current-project-chip');
          if (pChip) pChip.setAttribute('aria-expanded', 'false');
        });
        container.append(btn);
      }
    };

    renderListInto(list);
    renderListInto(sidebarList);

    // Also populate Topbar Quick Project Picker
    if (projectPickerList) {
      projectPickerList.replaceChildren();
      for (const conv of sortedItems.slice(0, 15)) {
        const isSelected = conv.id === state.activeConvId;
        const isHostCurrent = Boolean(conv.isCurrent || conv.id === state.hostConvId);
        const itemBtn = document.createElement('button');
        itemBtn.type = 'button';
        itemBtn.className = `picker-item${isSelected ? ' active' : ''}`;
        const title = escapeHtml(conv.project || (isHostCurrent ? t('مکالمه جاری') : 'پروژه'));
        const statusLabel = escapeHtml(ActivityHelper.statusLabel(conv.status, state.language));
        const currentBadge = isHostCurrent ? `<span class="rail-current-badge">${escapeHtml(t('مکالمه جاری'))}</span>` : '';
        itemBtn.innerHTML = `
          <span class="picker-item-title">
            <span>${isSelected ? '● ' : ''}${title}</span>
            <span>${currentBadge}<span class="rail-status-tag ${String(conv.status || '').toLowerCase()}">${statusLabel}</span></span>
          </span>
          <span class="picker-item-sub">${escapeHtml(conv.directive || '')}</span>
        `;
        itemBtn.addEventListener('click', () => {
          switchConversation(conv.id);
          const pDrop = $('#project-picker-dropdown');
          if (pDrop) pDrop.classList.add('hidden');
          const pChip = $('#current-project-chip');
          if (pChip) pChip.setAttribute('aria-expanded', 'false');
        });
        projectPickerList.append(itemBtn);
      }
    }
  }

    // Build a sleek collapsible drawer (<details class="tt-drawer ...">) for thoughts, critiques, questions, and full reports
  function buildDrawerHtml(kindClass, icon, titleText, bodyText, isOpen = false) {
    const cleanBody = String(bodyText || '').trim();
    if (!cleanBody) return '';
    const firstLine = cleanBody.split(/\r?\n/).find((l) => l.trim().length > 0) || cleanBody;
    const snippet = firstLine.length > 95 ? firstLine.slice(0, 95) + '…' : firstLine;
    return `<details class="tt-drawer ${kindClass}"${isOpen ? ' open' : ''}>` +
      `<summary class="tt-drawer-summary">` +
        `<span class="tt-drawer-title"><span>${icon}</span><span>${escapeHtml(titleText)}</span></span>` +
        `<span class="tt-drawer-snippet">${escapeHtml(snippet)}</span>` +
        `<span class="tt-drawer-chevron">${escapeHtml(t('مشاهده کامل'))}</span>` +
      `</summary>` +
      `<div class="tt-drawer-body">${escapeHtml(cleanBody)}</div>` +
    `</details>`;
  }

  // Render Live Working & Thinking Strip in Chatroom (for working subagents + currently selected chat target)
  function renderLiveChatStrip() {
    const strip = $('#chat-live-activity-strip');
    if (!strip) return;

    const workingAgents = state.agents.filter((a) => {
      const st = String(a?.status || '').toUpperCase();
      return st === 'ACTIVE' || st === 'RUNNING';
    });

    const itemsToShow = [...workingAgents];
    if (state.composerTarget) {
      const targetClean = String(state.composerTarget).toLowerCase().replace(/[-_]/g, '');
      const alreadyIn = itemsToShow.some((a) => {
        const aId = String(a.id || '').toLowerCase().replace(/[-_]/g, '');
        const aName = String(a.name || a.role || '').toLowerCase().replace(/[-_]/g, '');
        return aId === targetClean || aName === targetClean || aId === `agent${targetClean}`;
      });
      if (!alreadyIn) {
        const foundAgent = state.agents.find((a) => {
          const aId = String(a.id || '').toLowerCase().replace(/[-_]/g, '');
          const aName = String(a.name || a.role || '').toLowerCase().replace(/[-_]/g, '');
          return aId === targetClean || aName === targetClean || aId === `agent${targetClean}`;
        });
        const matchedRole = findMatchingRole(state.composerTarget);
        if (foundAgent) {
          itemsToShow.unshift(foundAgent);
        } else if (matchedRole) {
          itemsToShow.unshift({
            id: matchedRole.id,
            name: I18N.roleText(matchedRole, 'title', state.language),
            role: matchedRole.agent_name || matchedRole.id,
            status: 'READY',
            thought: I18N.roleText(matchedRole, 'specialty', state.language),
            task: t('آمادهٔ گفت‌وگو و دریافت دستور مستقیم در چت‌روم'),
          });
        }
      }
    }

    if (!itemsToShow.length) {
      strip.classList.add('hidden');
      strip.replaceChildren();
      return;
    }

    strip.classList.remove('hidden');
    strip.innerHTML = itemsToShow.slice(0, 4).map((ag) => {
      const st = String(ag.status || '').toUpperCase();
      const isWorking = st === 'ACTIVE' || st === 'RUNNING';
      const roleMatch = findMatchingRole(ag.id || ag.role || ag.name);
      const displayName = roleMatch ? I18N.roleText(roleMatch, 'title', state.language) : (ag.name || ag.role || ag.id);
      const avatarUrl = getAvatarUrl(ag.id || ag.role || ag.name);
      const thoughtText = ag.thought || ag.currentThought || ag.task || ag.currentTask || t('در حال پایش و هم‌فکری زنده در اتاق فکر…');
      const toolText = ag.tool || ag.activeTool || '';
      const badgeText = isWorking ? t('در حال فکر و اجرا') : t('مخاطب انتخاب‌شده');
      return `<div class="live-strip-item">` +
        `<img class="live-strip-avatar" src="${avatarUrl}" alt="${escapeHtml(displayName)}">` +
        `<span class="live-strip-agent">${escapeHtml(displayName)}</span>` +
        `<span class="live-strip-badge"><i class="live-pulse-dot" aria-hidden="true"></i><span>${escapeHtml(badgeText)}</span></span>` +
        `<span class="live-strip-thought" title="${escapeHtml(thoughtText)}">💡 ${escapeHtml(thoughtText)}</span>` +
        (toolText ? `<span class="live-strip-tool">⚡ ${escapeHtml(toolText)}</span>` : '') +
      `</div>`;
    }).join('');
  }

  // Build the In-Chatroom Interactive Decision Card element
  function createChatDecisionCard(proposal) {
    const card = document.createElement('article');
    const isCompleted = ['COMPLETED', 'DONE'].includes(String(proposal.status).toUpperCase()) ||
      ['COMPLETED', 'DONE'].includes(String(state.status).toUpperCase());
    const isPending = ['PROPOSED', 'AWAITING_APPROVAL', 'WAITING_APPROVAL', 'PENDING'].includes(String(proposal.status).toUpperCase()) &&
      !proposal.userDecision && !isCompleted;
    const isApproved = !isCompleted && (proposal.status === 'APPROVED' || proposal.userDecision?.action === 'APPROVED');
    const isRevision = !isCompleted && (proposal.status === 'REVISION_REQUESTED' || proposal.userDecision?.action === 'REVISION_REQUESTED');
    const isHalted = !isCompleted && (proposal.status === 'HALTED' || proposal.userDecision?.action === 'HALTED');

    card.className = `chat-decision-card${isPending ? ' needs-decision' : ''}${isCompleted ? ' completed' : ''}`;
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', t('طرح پیشنهادی و تصمیم‌گیری'));

    let tagClass = 'decision-tag';
    let tagLabel = t('طرح پیشنهادی در انتظار تصمیم');
    let tagIcon = '⚡';
    if (isCompleted) {
      tagClass += ' completed';
      tagLabel = t('طرح و تسک با موفقیت تکمیل شد');
      tagIcon = '🏁';
    } else if (isApproved) {
      tagClass += ' approved';
      tagLabel = t('طرح تأیید شد و در فاز اجراست');
      tagIcon = '✅';
    } else if (isRevision) {
      tagClass += ' revision';
      tagLabel = t('درخواست بازنگری و اصلاح');
      tagIcon = '📝';
    } else if (isHalted) {
      tagClass += ' halted';
      tagLabel = t('نشست متوقف شد');
      tagIcon = '🛑';
    }

    const currentSelectedOptionId = state.selectedProposalOption || proposal.userDecision?.optionId || null;

    // Build Council Consensus & Critique Matrix HTML
    const votes = Array.isArray(proposal.votes) ? proposal.votes : [];
    let councilMatrixHtml = '';
    if (votes.length) {
      const stanceMeta = {
        APPROVE: { label: '✅ موافق', cls: 'approve' },
        CONDITIONAL: { label: '⚠️ موافقت مشروط', cls: 'conditional' },
        CRITIQUE: { label: '⚔ نقد و چالش', cls: 'critique' },
        REJECT: { label: '🛑 مخالف', cls: 'reject' },
      };
      const voteCards = votes.map((v) => {
        const st = String(v.stance || 'APPROVE').toUpperCase();
        const meta = stanceMeta[st] || stanceMeta.APPROVE;
        const conf = v.confidence ? ` · ${num(v.confidence)}٪` : '';
        const commentStr = String(v.comment || '').trim();
        const shortComment = commentStr.length > 130 ? commentStr.slice(0, 130) + '…' : commentStr;
        const fullDrawer = commentStr.length > 130
          ? buildDrawerHtml('report-card', '📄', t('گزارش کامل و جزئیات فنی'), commentStr, false)
          : '';
        const critiqueDrawer = v.counterArgument
          ? buildDrawerHtml('critique-card', '⚔', t('نقد و بازبینی موشکافانه'), v.counterArgument, false)
          : '';
        return `<div class="council-vote-card stance-${meta.cls}">` +
          `<div class="council-vote-top">` +
            `<span class="council-voter-name">${escapeHtml(v.voterName || v.voterId || 'عضو شورا')}</span>` +
            `<span class="council-stance-badge ${meta.cls}">${escapeHtml(t(meta.label))}${conf}</span>` +
          `</div>` +
          (shortComment ? `<p class="council-vote-comment">${escapeHtml(shortComment)}</p>` : '') +
          fullDrawer +
          critiqueDrawer +
        `</div>`;
      }).join('');

      councilMatrixHtml = `<div class="council-consensus-box">` +
        `<div class="council-consensus-head">` +
          `<span class="council-consensus-title"><span>🏛️</span><span>${t('ماتریس آراء، توافق و نقدهای شورای ساب‌ایجنت‌ها')} (${num(votes.length)})</span></span>` +
        `</div>` +
        `<div class="council-votes-grid">${voteCards}</div>` +
      `</div>`;
    }

    // Build Participating Subagents Summary Roster when task is Completed
    let completedRosterHtml = '';
    if (isCompleted) {
      const participantMap = new Map();
      for (const st of (state.subtasks || [])) {
        const key = st.assignee || st.assigneeName || 'team-manager';
        const roleMatch = findMatchingRole(key);
        const idKey = roleMatch ? roleMatch.id : key;
        const label = roleMatch ? I18N.roleText(roleMatch, 'title', state.language) : (st.assigneeName || key);
        const prev = participantMap.get(idKey) || { id: idKey, label, count: 0 };
        prev.count += 1;
        participantMap.set(idKey, prev);
      }
      for (const v of votes) {
        const key = v.voterId || v.voterName;
        if (!key) continue;
        const roleMatch = findMatchingRole(key);
        const idKey = roleMatch ? roleMatch.id : key;
        if (!participantMap.has(idKey)) {
          const label = roleMatch ? I18N.roleText(roleMatch, 'title', state.language) : (v.voterName || key);
          participantMap.set(idKey, { id: idKey, label, count: 1 });
        }
      }
      const participants = [...participantMap.values()];
      if (participants.length) {
        const chipsHtml = participants.map((p) => {
          const av = getAvatarUrl(p.id);
          return `<span class="completed-agent-chip">` +
            `<img src="${av}" alt="${escapeHtml(p.label)}">` +
            `<span>${escapeHtml(p.label)}</span>` +
            `<small style="color:var(--emerald);font-weight:800;">✓ ${num(p.count)}</small>` +
          `</span>`;
        }).join('');
        completedRosterHtml = `<div style="margin-top:4px;">` +
          `<div style="font-size:10.5px;font-weight:700;color:var(--emerald);margin-bottom:5px;">✨ ${escapeHtml(t('ساب‌ایجنت‌های مشارکت‌کننده در تکمیل تسک'))}:</div>` +
          `<div class="completed-team-roster">${chipsHtml}</div>` +
        `</div>`;
      }
    }

    card.innerHTML = `<div class="decision-header">` +
        `<span class="${tagClass}"><span>${tagIcon}</span><span>${escapeHtml(tagLabel)}</span></span>` +
        (proposal.author ? `<span class="decision-author">${t('ارائه‌دهنده:')} <strong>${escapeHtml(proposal.author)}</strong></span>` : '') +
      `</div>` +
      `<h3 class="decision-title">${escapeHtml(proposal.title || t('طرح راهبردی اتاق فکر'))}</h3>` +
      `<p class="decision-summary">${escapeHtml(proposal.summary || '')}</p>` +
      completedRosterHtml +
      councilMatrixHtml +
      (isCompleted ? '' : `<div class="decision-options" id="chat-decision-options"></div>`) +
      `<div class="decision-actions" id="chat-decision-actions"></div>`;

    const optionsContainer = card.querySelector('#chat-decision-options');
    const actionsContainer = card.querySelector('#chat-decision-actions');

    const rawOpts = proposal.decisionOptions || proposal.options || [];
    if (!isCompleted && rawOpts.length && optionsContainer) {
      for (let i = 0; i < rawOpts.length; i++) {
        const opt = rawOpts[i];
        const optId = typeof opt === 'object' && opt.id ? opt.id : `opt-${i + 1}`;
        const optLabel = typeof opt === 'object' && opt.label ? opt.label : String(opt);
        const isChosen = currentSelectedOptionId === optId;

        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.className = `decision-option-btn${isChosen ? ' selected' : ''}`;
        optBtn.setAttribute('aria-pressed', isChosen ? 'true' : 'false');
        optBtn.innerHTML = `<span class="decision-option-radio"></span><span>${escapeHtml(optLabel)}</span>`;

        if (isPending) {
          optBtn.addEventListener('click', async () => {
            try {
              state.selectedProposalOption = optId;
              optionsContainer.querySelectorAll('.decision-option-btn').forEach((b) => {
                b.classList.remove('selected');
                b.setAttribute('aria-pressed', 'false');
              });
              optBtn.classList.add('selected');
              optBtn.setAttribute('aria-pressed', 'true');
              await apiPost('/api/proposal/action', {
                convId: state.activeConvId,
                action: 'select_option',
                optionId: optId,
                comment: optLabel,
              });
              toast(`گزینه «${optLabel}» انتخاب شد.`);
              pollStatus();
            } catch (err) {
              toast(err.message);
            }
          });
        } else {
          optBtn.style.cursor = 'default';
        }
        optionsContainer.append(optBtn);
      }
    }

    if (actionsContainer) {
      if (isPending) {
        // 1. Approve & Execute Button
        const btnApprove = document.createElement('button');
        btnApprove.type = 'button';
        btnApprove.className = 'primary-button';
        btnApprove.innerHTML = `<span>✓</span><span>${t('تأیید و اجرا')}</span>`;
        btnApprove.addEventListener('click', async () => {
          try {
            await apiPost('/api/proposal/action', {
              convId: state.activeConvId,
              action: 'approve',
              optionId: state.selectedProposalOption || currentSelectedOptionId,
              comment: 'طرح توسط کاربر تأیید شد و دستور اجرای قطعی صادر شد.',
            });
            toast('طرح با موفقیت تأیید شد و به فاز اجرا رفت.');
            pollStatus();
          } catch (err) {
            toast(err.message);
          }
        });

        // 2. Request Revision Button
        const btnRevision = document.createElement('button');
        btnRevision.type = 'button';
        btnRevision.className = 'secondary-button';
        btnRevision.innerHTML = `<span>✍</span><span>${t('درخواست اصلاح')}</span>`;
        btnRevision.addEventListener('click', async () => {
          const comment = window.prompt(t('توضیحات اصلاح را وارد کنید (اختیاری):'));
          if (comment === null) return;
          const trimmedComment = comment.trim() || 'نیاز به بازنگری و چکش‌کاری مجدد طرح';
          try {
            await apiPost('/api/proposal/action', {
              convId: state.activeConvId,
              action: 'request_revision',
              comment: trimmedComment,
            });
            toast('درخواست اصلاح برای ساب‌ایجنت‌ها ارسال شد.');
            pollStatus();
          } catch (err) {
            toast(err.message);
          }
        });

        // 3. Halt Button
        const btnHalt = document.createElement('button');
        btnHalt.type = 'button';
        btnHalt.className = 'secondary-button';
        btnHalt.style.color = 'var(--danger, #f43f5e)';
        btnHalt.innerHTML = `<span>■</span><span>${t('توقف نشست')}</span>`;
        btnHalt.addEventListener('click', async () => {
          if (!window.confirm(t('آیا از توقف کامل نشست اطمینان دارید؟'))) return;
          try {
            await apiPost('/api/proposal/action', {
              convId: state.activeConvId,
              action: 'halt',
              comment: 'توقف نشست توسط کاربر',
            });
            toast('نشست متوقف شد.');
            pollStatus();
          } catch (err) {
            toast(err.message);
          }
        });

        actionsContainer.append(btnApprove, btnRevision, btnHalt);
      } else if (proposal.userDecision) {
        const banner = document.createElement('div');
        banner.className = 'decision-status-banner';
        banner.innerHTML = `
          <span>${t('تصمیم ثبت‌شده:')} <strong>${escapeHtml(proposal.userDecision.comment || proposal.userDecision.action)}</strong></span>
          ${proposal.userDecision.timestamp ? `<time style="color:var(--faint);font-size:10px;margin-inline-start:auto;">${escapeHtml(proposal.userDecision.timestamp)}</time>` : ''}
        `;
        actionsContainer.append(banner);
      }
    }

    return card;
  }

  function renderChat() {
    const emptyState = $('#chat-empty');
    const activeState = $('#chat-active');
    if (!state.activeConvId) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (activeState) activeState.classList.add('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (activeState) activeState.classList.remove('hidden');

    const projEl = $('#chat-project');
    if (projEl) projEl.textContent = state.project || t('پروژه بدون عنوان');
    const titleEl = $('#chat-title');
    if (titleEl) titleEl.textContent = state.directive || state.phase || t('هم‌اندیشی زنده');
    const statusEl = $('#chat-status');
    if (statusEl) {
      statusEl.textContent = t(state.status === 'ACTIVE' ? 'فعال' : state.status);
      statusEl.classList.toggle('running', state.status === 'ACTIVE');
    }

    // Mini members in header
    const membersEl = $('#chat-members');
    if (membersEl) {
      membersEl.replaceChildren();
      const activeAgents = state.agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING');
      for (const ag of activeAgents.slice(0, 5)) {
        const span = document.createElement('span');
        span.className = 'member-mini';
        span.title = ag.name || ag.role || ag.id;
        span.innerHTML = `<img src="${getAvatarUrl(ag.id || ag.role)}" alt="${ag.name || ag.id}">`;
        membersEl.append(span);
      }
      if (activeAgents.length > 5) {
        const more = document.createElement('span');
        more.className = 'members-caption';
        more.textContent = `+${activeAgents.length - 5}`;
        membersEl.append(more);
      }
    }

    // View Switching
    const msgContainer = $('#chat-messages');
    const subContainer = $('#chat-subtasks');
    const actContainer = $('#chat-activity');

    if (state.chatView === 'messages') {
      if (msgContainer) msgContainer.hidden = false;
      if (subContainer) subContainer.hidden = true;
      if (actContainer) actContainer.hidden = true;
    } else if (state.chatView === 'subtasks') {
      if (msgContainer) msgContainer.hidden = true;
      if (subContainer) subContainer.hidden = false;
      if (actContainer) actContainer.hidden = true;
    } else {
      if (msgContainer) msgContainer.hidden = true;
      if (subContainer) subContainer.hidden = true;
      if (actContainer) actContainer.hidden = false;
    }

    // Update Live Thinking & Working Strip at the top of the Chatroom
    renderLiveChatStrip();

    // Chat Messages State Diffing
    const p = state.proposal;
    const pVotesCount = Array.isArray(p?.votes) ? p.votes.length : 0;
    const pSig = p ? `${p.id}:${p.status}:${state.status}:${pVotesCount}:${p.userDecision?.action}:${p.userDecision?.optionId}:${state.selectedProposalOption}` : 'none';
    const activeAgSig = state.agents.map((a) => `${a.id}:${a.status}:${a.tool || ''}:${a.thought || ''}`).join('|');
    const mLen = state.messages.length;
    const firstM = mLen ? state.messages[0] : null;
    const lastM = mLen ? state.messages[mLen - 1] : null;
    const chatSig = `${state.activeConvId}:${state.chatView}:${pSig}:${activeAgSig}:${state._msgVer || 0}:${mLen}:${firstM?.id || ''}:${lastM?.id || ''}:${lastM?.content?.length || 0}:${state.language}`;

    if (chatSig !== signatures.chat && msgContainer && state.chatView === 'messages') {
      signatures.chat = chatSig;
      msgContainer.replaceChildren();

      // 1. If an active or recent proposal exists, render Decision Card at the TOP of messages stream
      if (state.proposal && (state.proposal.title || state.proposal.summary)) {
        const decisionCard = createChatDecisionCard(state.proposal);
        msgContainer.append(decisionCard);
      }

      // 2. Newest messages first at the top (descending chronological order)
      const messagesToRender = [...state.messages].reverse();

      if (!messagesToRender.length && !state.proposal) {
        const noMsg = document.createElement('div');
        noMsg.className = 'chat-pane-empty';
        noMsg.textContent = t('هنوز پیامی در این گفت‌وگو ثبت نشده است. پیام‌های دریافتی و پاسخ‌های واقعی اینجا نمایش داده می‌شوند.');
        msgContainer.append(noMsg);
      } else {
        for (const msg of messagesToRender) {
          const isUser = msg.senderCode === 'USER' || msg.isOperator;
          const isPeer = Boolean(msg.recipient || msg.recipientName || msg.recipientCode || msg.channel === 'SUBAGENTS');
          const row = document.createElement('div');
          row.className = `message-row${isUser ? ' user' : ''}${isPeer ? ' peer-dialogue' : ''}`;

          const avatarUrl = getAvatarUrl(msg.senderRole || msg.senderCode);

          // Collapsible Subagent Internal Thoughts Drawer
          const thoughtsText = msg.thoughts || msg.thought;
          const thoughtsHtml = thoughtsText
            ? buildDrawerHtml('thought-card', '💡', t('استدلال و تفکر درونی'), thoughtsText, false)
            : '';

          // Collapsible Subagent Critiques & Counter-Arguments Drawer
          const critiqueText = msg.critique || msg.counterArgument;
          const critiqueHtml = critiqueText
            ? buildDrawerHtml('critique-card', '⚔', t('نقد و بازبینی موشکافانه'), critiqueText, false)
            : '';

          // Collapsible Subagent Questions & Clarifications Drawer
          const questionText = msg.question || (Array.isArray(msg.questions) ? msg.questions.join('\n') : '');
          const questionHtml = questionText
            ? buildDrawerHtml('question-card', '❓', t('پرسش یا نکتهٔ نیازمند شفاف‌سازی'), questionText, false)
            : '';

          // Collapsible Full Report Drawer (from msg.report / msg.fullReport OR long msg.content)
          const rawContent = String(msg.content || '').trim();
          const explicitReport = String(msg.report || msg.fullReport || '').trim();
          let displayContent = rawContent;
          let reportDrawerHtml = '';
          if (explicitReport) {
            reportDrawerHtml = buildDrawerHtml('report-card', '📄', t('گزارش کامل و جزئیات فنی'), explicitReport, false);
          } else {
            const contentLines = rawContent.split(/\r?\n/);
            if (rawContent.length > 260 || contentLines.length > 4) {
              const summaryPreview = contentLines.slice(0, 3).join('\n').slice(0, 230).trim() + '…';
              displayContent = summaryPreview;
              reportDrawerHtml = buildDrawerHtml('report-card', '📄', t('متن کامل پیام و گزارش'), rawContent, false);
            }
          }

          // Check if sender is currently working in state.agents
          let workingInlinePill = '';
          if (!isUser) {
            const senderClean = String(msg.senderRole || msg.senderCode || msg.senderName || '').toLowerCase().replace(/[-_]/g, '');
            const senderAg = state.agents.find((a) => {
              const aId = String(a.id || '').toLowerCase().replace(/[-_]/g, '');
              const aName = String(a.name || a.role || '').toLowerCase().replace(/[-_]/g, '');
              return (aId && (aId === senderClean || aId === `agent${senderClean}`)) || (aName && aName === senderClean);
            });
            if (senderAg && ['ACTIVE', 'RUNNING'].includes(String(senderAg.status || '').toUpperCase())) {
              const activeToolSuffix = senderAg.tool ? ` · ⚡ ${escapeHtml(senderAg.tool)}` : '';
              workingInlinePill = `<span class="agent-working-inline-pill"><i class="live-pulse-dot" aria-hidden="true"></i><span>${escapeHtml(t('در حال اجرا'))}${activeToolSuffix}</span></span>`;
            }
          }

          // Channel Badges
          let channelBadge = '';
          if (msg.channel === 'SUBAGENTS' || isPeer) {
            channelBadge = `<span class="channel-badge subagents">${t('مباحثهٔ زیرعامل‌ها')}</span>`;
          } else if (msg.channel && msg.channel !== 'MAIN') {
            const chanClass = String(msg.channel).toLowerCase();
            channelBadge = `<span class="channel-badge ${chanClass}">${escapeHtml(msg.channel)}</span>`;
          }

          const btwBadge = msg.isBtw ? `<span style="background:var(--amber);color:#000;border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700;margin-inline-end:4px;">BTW</span>` : '';

          // Peer dialogue label: Sender ➔ Recipient
          let recipientName = msg.recipientName || msg.recipient || msg.recipientCode;
          if (!recipientName && rawContent) {
            const mentionMatch = rawContent.match(/@([a-zA-Z0-9_\u0600-\u06FF-]+)/);
            if (mentionMatch) recipientName = mentionMatch[1];
          }
          let peerBadge = '';
          if (recipientName) {
            peerBadge = `<span class="peer-flow-badge">` +
              `<span class="peer-sender">${escapeHtml(msg.senderName || msg.senderRole || t('عامل'))}</span>` +
              `<span class="peer-arrow" title="${t('در حال گفتگو با')}">➔</span>` +
              `<span class="peer-recipient" title="${t('مخاطب')}">${escapeHtml(recipientName)}</span>` +
            `</span>`;
          } else {
            peerBadge = `<span class="message-label">${escapeHtml(msg.senderName || msg.senderRole || t('کاربر'))}</span>`;
          }

          row.innerHTML = `<div class="message-avatar"><img src="${avatarUrl}" alt="${escapeHtml(msg.senderName || '')}"></div>` +
            `<div class="message-bubble">` +
              `<div class="message-meta">` +
                `<div class="message-meta-start">${peerBadge}${btwBadge}${channelBadge}${workingInlinePill}</div>` +
                `<div class="message-meta-end"><span class="message-time">${escapeHtml(msg.timestamp || '')}</span></div>` +
              `</div>` +
              `<div class="message-content">${escapeHtml(displayContent)}</div>` +
              thoughtsHtml +
              critiqueHtml +
              questionHtml +
              reportDrawerHtml +
            `</div>`;
          msgContainer.append(row);
        }
        // Since newest is at the top, scroll to top
        msgContainer.scrollTop = 0;
      }
    }

    // Always update actions count in header controls
    const calls = state.telemetry.toolCalls || [];
    const logs = state.telemetry.terminalLogs || [];
    const tasks = state.telemetry.backgroundTasks || [];
    const actionCountEl = $('#chat-action-count');
    if (actionCountEl) actionCountEl.textContent = num(calls.length + logs.length + tasks.length);

    // Actions View Diffing
    const actSig = `${state.activeConvId}:${state.chatView}:${calls.length}:${logs.length}:${tasks.length}:${state.language}`;

    if (actSig !== signatures.chatActivity && actContainer && state.chatView === 'actions') {
      signatures.chatActivity = actSig;
      actContainer.replaceChildren();

      // Newest actions first at the top (descending chronological order)
      const allActions = [
        ...calls.map((c, i) => ({ type: 'tool', item: c, time: c.timestamp || '', _sortKey: getEventTimeValue(c, i) })),
        ...logs.map((l, i) => ({ type: 'term', item: l, time: l.timestamp || '', _sortKey: getEventTimeValue(l, i) })),
        ...tasks.map((k, i) => ({ type: 'task', item: k, time: k.startedAt || k.timestamp || '', _sortKey: getEventTimeValue(k, i) })),
      ].sort((a, b) => a._sortKey - b._sortKey).reverse().slice(0, 100);

      if (!allActions.length) {
        const noAct = document.createElement('div');
        noAct.className = 'chat-pane-empty';
        noAct.textContent = t('هنوز ابزار یا فرمانی در این نشست اجرا نشده است.');
        actContainer.append(noAct);
      } else {
        for (const action of allActions) {
          const card = document.createElement('div');
          card.className = 'chat-action-card';
          if (action.type === 'tool') {
            const isErr = action.item.status === 'ERROR';
            const isMcp = Boolean(action.item.tool && (action.item.tool.startsWith('mcp') || action.item.tool.includes('__') || action.item.source === 'mcp' || action.item.tool.includes('/')));
            const mcpBadge = isMcp ? '<span class="action-tag mcp">MCP</span>' : '';
            const agentName = action.item.agentName || action.item.agentId || 'Antigravity';

            let argsBox = '';
            if (action.item.args && typeof action.item.args === 'object' && Object.keys(action.item.args).length) {
              const str = JSON.stringify(action.item.args);
              argsBox = `<div class="action-preview-box"><strong>${t('پارامترها:')}</strong> <code>${escapeHtml(str.length > 240 ? str.slice(0, 240) + '…' : str)}</code></div>`;
            }
            let outBox = '';
            if (action.item.output) {
              const outStr = String(action.item.output).trim();
              if (outStr) {
                outBox = `<div class="action-preview-box output"><strong>${t('خروجی:')}</strong> <code>${escapeHtml(outStr.length > 240 ? outStr.slice(0, 240) + '…' : outStr)}</code></div>`;
              }
            }

            card.innerHTML = `
              <div class="chat-action-icon">${isErr ? '⚠' : (isMcp ? '🔌' : '⚡')}</div>
              <div class="chat-action-body">
                <div class="chat-action-head-row">
                  <span class="action-agent-pill">${escapeHtml(agentName)}</span>
                  ${mcpBadge}
                  <strong class="chat-action-title">${t('فعالیت ابزار')}: ${escapeHtml(action.item.tool || 'Unknown Tool')}</strong>
                </div>
                <p class="chat-action-detail">${t('وضعیت دریافتی')}: ${ActivityHelper.statusLabel(action.item.status, state.language)}</p>
                ${argsBox}
                ${outBox}
                ${action.item.error ? `<pre style="color:var(--danger);font-size:10px;margin-top:4px;">${escapeHtml(action.item.error)}</pre>` : ''}
              </div>
              <span class="chat-action-time">${escapeHtml(action.time)}</span>
            `;
          } else if (action.type === 'term') {
            const agentName = action.item.agentName || action.item.agentId || 'سیستم';
            let outBox = '';
            if (action.item.output) {
              const outStr = String(action.item.output).trim();
              if (outStr) {
                outBox = `<div class="action-preview-box output"><strong>${t('خروجی:')}</strong> <code>${escapeHtml(outStr.length > 200 ? outStr.slice(0, 200) + '…' : outStr)}</code></div>`;
              }
            }
            card.innerHTML = `
              <div class="chat-action-icon">⌨</div>
              <div class="chat-action-body">
                <div class="chat-action-head-row">
                  <span class="action-agent-pill">${escapeHtml(agentName)}</span>
                  <strong class="chat-action-title">${t('فرمان ترمینال')}: ${escapeHtml(action.item.command || 'Command')}</strong>
                </div>
                <p class="chat-action-detail">${t('وضعیت دریافتی')}: ${ActivityHelper.statusLabel(action.item.status, state.language)}${action.item.exitCode !== undefined ? ` · Exit: ${action.item.exitCode}` : ''}</p>
                ${outBox}
              </div>
              <span class="chat-action-time">${escapeHtml(action.time)}</span>
            `;
          } else {
            const agentName = action.item.agentName || action.item.agentId || t('عامل');
            card.innerHTML = `
              <div class="chat-action-icon">⚙</div>
              <div class="chat-action-body">
                <div class="chat-action-head-row">
                  <span class="action-agent-pill">${escapeHtml(agentName)}</span>
                  <strong class="chat-action-title">${t('فرمان پس‌زمینه')}: ${escapeHtml(action.item.title || action.item.command || 'Background Task')}</strong>
                </div>
                <p class="chat-action-detail">${t('وضعیت دریافتی')}: ${ActivityHelper.statusLabel(action.item.status, state.language)}${action.item.pid ? ` · PID: ${action.item.pid}` : ''}</p>
              </div>
              <span class="chat-action-time">${escapeHtml(action.time)}</span>
            `;
          }
          actContainer.append(card);
        }
        actContainer.scrollTop = 0;
      }
    }

    renderSubtasks();
  }

  function renderSubtasks() {
    const subtasks = Array.isArray(state.subtasks) ? state.subtasks : [];
    const total = subtasks.length;
    const done = subtasks.filter((s) => ['COMPLETED', 'DONE'].includes(String(s.status).toUpperCase())).length;
    const inReview = subtasks.filter((s) => String(s.status).toUpperCase() === 'REVIEW').length;
    const inProgress = subtasks.filter((s) => String(s.status).toUpperCase() === 'IN_PROGRESS').length;
    const pct = total > 0 ? Math.round(((done + inReview * 0.75 + inProgress * 0.35) / total) * 100) : (state.progress || 0);

    const chatCountEl = $('#chat-subtask-count');
    if (chatCountEl) chatCountEl.textContent = num(total);
    const doneCountEl = $('#subtask-done-count');
    if (doneCountEl) doneCountEl.textContent = num(done);
    const totalCountEl = $('#subtask-total-count');
    if (totalCountEl) totalCountEl.textContent = num(total);
    const pctEl = $('#subtask-progress-pct');
    if (pctEl) pctEl.textContent = `${num(pct)}٪`;
    const fillEl = $('#subtasks-progress-fill');
    if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    const barEl = $('#subtasks-progressbar');
    if (barEl) barEl.setAttribute('aria-valuenow', String(pct));

    const subSig = `${state.activeConvId}:${state.chatView}:${pct}:${subtasks.map((s) => `${s.id}:${s.status}:${s.assignee}:${s.title}`).join('|')}:${state.language}`;
    if (subSig === signatures.subtasks) return;
    signatures.subtasks = subSig;

    const statusLabels = {
      ASSIGNED: 'واگذارشده',
      IN_PROGRESS: 'در حال اجرا',
      REVIEW: 'آمادهٔ بازبینی',
      COMPLETED: 'تکمیل‌شده',
      DONE: 'تکمیل‌شده',
      BLOCKED: 'مسدود / نیازمند بررسی',
    };

    const priorityLabels = {
      CRITICAL: 'فوری / حیاتی',
      HIGH: 'اولویت بالا',
      NORMAL: 'اولویت عادی',
      LOW: 'اولویت پایین',
    };

    // Newest subtasks first at the top
    const sortedSubtasks = [...subtasks].reverse();

    const buildSubtaskListInto = (container) => {
      if (!container) return;
      container.replaceChildren();
      if (!sortedSubtasks.length) {
        const empty = document.createElement('div');
        empty.className = 'chat-pane-empty';
        empty.textContent = t('هنوز تسک خردشده‌ای برای این پروژه ثبت نشده است. مدیر تیم یا شما می‌توانید بخش‌های کار را به ساب‌ایجنت‌ها واگذار کنید.');
        container.append(empty);
        return;
      }

      for (const st of sortedSubtasks) {
        const stCode = String(st.status || 'ASSIGNED').toUpperCase();
        const stCls = stCode.toLowerCase();
        const prioCode = String(st.priority || 'NORMAL').toUpperCase();
        const prioCls = prioCode.toLowerCase();
        const card = document.createElement('article');
        card.className = `subtask-card status-${stCls}`;

        const avatarUrl = getAvatarUrl(st.assignee || st.assigneeName);
        const assigneeDisplay = st.assigneeName || st.assignee || t('ساب‌ایجنت');
        const stThoughtsHtml = st.thoughts
          ? buildDrawerHtml('thought-card', '💡', t('استدلال و تفکر درونی'), st.thoughts, false)
          : '';
        const stReportHtml = st.report
          ? buildDrawerHtml('report-card', '📄', t('گزارش کامل و جزئیات فنی'), st.report, false)
          : '';

        card.innerHTML = `<div class="subtask-head">` +
            `<span class="subtask-assignee">` +
              `<img src="${avatarUrl}" alt="${escapeHtml(assigneeDisplay)}">` +
              `<span>${escapeHtml(assigneeDisplay)}</span>` +
            `</span>` +
            `<span class="subtask-badges">` +
              `<span class="subtask-priority-pill ${prioCls}">${escapeHtml(t(priorityLabels[prioCode] || prioCode))}</span>` +
              `<span class="subtask-status-pill ${stCls}">${escapeHtml(t(statusLabels[stCode] || stCode))}</span>` +
            `</span>` +
          `</div>` +
          `<h3 class="subtask-title">${escapeHtml(st.title)}</h3>` +
          (st.deliverable ? `<p class="subtask-deliverable">🎯 <strong>${t('خروجی و شواهد:')}</strong> ${escapeHtml(st.deliverable)}</p>` : '') +
          stThoughtsHtml +
          stReportHtml +
          `<div class="subtask-footer">` +
            `<span style="font-size:9.5px;color:var(--faint);">${escapeHtml(st.assignedBy || '')} ${st.updatedAt ? `· ${escapeHtml(st.updatedAt)}` : ''}</span>` +
            `<div class="subtask-actions">` +
              `<button type="button" class="subtask-step-btn ${stCode === 'IN_PROGRESS' ? 'active' : ''}" data-subtask-status="IN_PROGRESS">${t('▶ شروع اجرا')}</button>` +
              `<button type="button" class="subtask-step-btn ${stCode === 'REVIEW' ? 'active' : ''}" data-subtask-status="REVIEW">${t('🔍 بازبینی')}</button>` +
              `<button type="button" class="subtask-step-btn ${['COMPLETED', 'DONE'].includes(stCode) ? 'active' : ''}" data-subtask-status="COMPLETED">${t('✓ تکمیل شد')}</button>` +
            `</div>` +
          `</div>`;

        card.querySelectorAll('[data-subtask-status]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const nextStatus = btn.dataset.subtaskStatus;
            try {
              await apiPost('/api/subtasks/upsert', {
                convId: state.activeConvId,
                id: st.id,
                title: st.title,
                assignee: st.assignee,
                assigneeName: st.assigneeName,
                assignedBy: st.assignedBy || 'کاربر / مدیر تیم',
                status: nextStatus,
                priority: st.priority || 'NORMAL',
                deliverable: st.deliverable || '',
              });
              toast(`وضعیت تسک «${st.title.slice(0, 32)}» به «${statusLabels[nextStatus] || nextStatus}» تغییر یافت.`);
              pollStatus();
            } catch (err) {
              toast(err.message);
            }
          });
        });

        container.append(card);
      }
    };

    buildSubtaskListInto($('#overview-subtasks-list'));
    buildSubtaskListInto($('#chat-subtasks'));
  }

  function renderTeam() {
    const grid = $('#team-grid');
    if (!grid) return;

    const agSig = state.agents.map((a) => `${a.id}:${a.status}:${a.task || ''}:${a.tool || ''}:${(a.collaboratingWith || []).join(',')}`).join('|');
    const subSig = (state.subtasks || []).map((s) => `${s.id}:${s.status}:${s.assignee}`).join('|');
    const toolLen = (state.telemetry.toolCalls || []).length;
    const teamSig = `${state.roleCategory}:${state.roles.length}:${agSig}:${subSig}:${toolLen}:${state.language}`;
    if (teamSig === signatures.team) return;
    signatures.team = teamSig;

    grid.replaceChildren();

    const liveCountEl = $('#team-live-count');
    const activeAgents = state.agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING');
    if (liveCountEl) liveCountEl.textContent = `${num(activeAgents.length)} ${t('عضو فعال')}`;

    // Filter catalog roles
    let visibleRoles = [...state.roles];
    if (state.roleCategory && state.roleCategory !== 'all') {
      visibleRoles = state.roles.filter((r) => r.category === state.roleCategory);
    }

    // Include dynamic subagents from state.agents that don't match any catalog role
    if (!state.roleCategory || state.roleCategory === 'all' || state.roleCategory === 'specialist') {
      for (const ag of state.agents) {
        if (!ag || !ag.id) continue;
        const matched = state.roles.find((r) => {
          const aId = String(ag.id || '').toLowerCase().replace(/[-_]/g, '');
          const rId = String(r.id || '').toLowerCase().replace(/[-_]/g, '');
          const aName = String(ag.name || ag.agent_name || '').toLowerCase().replace(/[-_]/g, '');
          const rName = String(r.agent_name || '').toLowerCase().replace(/[-_]/g, '');
          return aId === rId || aName === rName || aId === `agent${rId}`;
        });
        if (!matched) {
          visibleRoles.push({
            id: ag.id,
            title: ag.name || ag.id,
            category: 'specialist',
            specialty: ag.role || t('عامل کمکی هوشمند'),
            description: ag.task || t('ساب‌ایجنت فعال در ناوگان هم‌افزایی زنده'),
            icon: ag.icon || '🤖',
            avatar: null,
            skills: ag.skills || ['task-execution', 'live-collaboration'],
            isDynamic: true,
            rawAgent: ag,
          });
        }
      }
    }

    // Update filter counts
    for (const cat of ['all', 'core', 'engineering', 'quality', 'specialist']) {
      const btn = $(`[data-role-category="${cat}"]`);
      if (btn) {
        const count = cat === 'all' ? state.roles.length : state.roles.filter((r) => r.category === cat).length;
        const small = btn.querySelector('small');
        if (small) small.textContent = num(count);
        btn.setAttribute('aria-pressed', state.roleCategory === cat ? 'true' : 'false');
      }
    }

    if (!visibleRoles.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('فهرست نقش‌ها بارگیری نشد.');
      grid.append(empty);
      return;
    }

    for (const role of visibleRoles) {
      const activeMatch = role.rawAgent || state.agents.find((a) => {
        if (!a) return false;
        const matched = findMatchingRole(a.id || a.role || a.name || a.agent_name);
        if (matched && matched.id === role.id) return true;
        const aId = String(a.id || '').toLowerCase().replace(/[-_]/g, '');
        const rId = String(role.id || '').toLowerCase().replace(/[-_]/g, '');
        const aName = String(a.name || a.agent_name || '').toLowerCase().replace(/[-_]/g, '');
        const rName = String(role.agent_name || '').toLowerCase().replace(/[-_]/g, '');
        return aId === rId || aName === rName || aId === `agent${rId}`;
      });
      const isActive = Boolean(activeMatch && (activeMatch.status === 'ACTIVE' || activeMatch.status === 'RUNNING'));

      const card = document.createElement('article');
      card.className = 'team-card';
      const avatarSrc = role.avatar ? `/assets/avatars/${role.avatar}` : '/assets/avatars/role-main-agent.svg';

      let taskHtml = '';
      const currentTask = activeMatch?.task || activeMatch?.currentTask;
      const activeTool = activeMatch?.tool || activeMatch?.activeTool;
      const currentThought = activeMatch?.thought || activeMatch?.currentThought;
      if (activeMatch && (currentTask || activeTool || currentThought)) {
        taskHtml = '<div class="team-task-box">';
        if (currentTask) {
          taskHtml += `<div><strong>${t('کار جاری:')}</strong> <span>${escapeHtml(currentTask)}</span></div>`;
        }
        if (activeTool) {
          taskHtml += `<div><strong style="color:var(--amber);">⚡ ${t('ابزار فعال:')}</strong> <span>${escapeHtml(activeTool)}</span></div>`;
        }
        if (currentThought) {
          taskHtml += buildDrawerHtml('thought-card', '💡', t('فکر جاری:'), currentThought, false);
        }
        taskHtml += '</div>';
      }

      // Collaboration box
      let collabHtml = '';
      const collabWith = activeMatch?.collaboratingWith;
      if (Array.isArray(collabWith) && collabWith.length > 0) {
        collabHtml = `
          <div class="team-collab-box">
            <span class="collab-pulse-icon">🔄</span>
            <div>
              <strong>${t('در حال گفت‌وگو با:')}</strong>
              <span>${escapeHtml(collabWith.map((c) => {
                const partnerRole = findMatchingRole(c);
                return partnerRole ? I18N.roleText(partnerRole, 'title', state.language) : c;
              }).join('، '))}</span>
            </div>
          </div>
        `;
      }

      // Recent tool call chip
      let recentToolHtml = '';
      const matchingTool = (state.telemetry.toolCalls || []).find((tc) => {
        const agId = String(activeMatch?.id || role.id || '').toLowerCase();
        const tcAgentId = String(tc.agentId || '').toLowerCase();
        const tcAgentName = String(tc.agentName || '').toLowerCase();
        const tcRoleTitle = String(role.title || '').toLowerCase();
        return tcAgentId === agId || tcAgentName === agId || tcAgentName === tcRoleTitle || (tcAgentId === 'antigravity' && role.id === 'main_agent');
      });
      if (matchingTool) {
        recentToolHtml = `
          <div class="team-recent-tool-chip">
            <span class="tool-chip-badge">⚡ ${escapeHtml(matchingTool.tool)}</span>
            <span class="tool-chip-status ${matchingTool.status === 'ERROR' ? 'err' : 'ok'}">${ActivityHelper.statusLabel(matchingTool.status, state.language)}</span>
            ${matchingTool.latencyMs ? `<span class="tool-chip-latency">${matchingTool.latencyMs}ms</span>` : ''}
          </div>
        `;
      }

      // Assigned Subtasks for this agent
      let subtasksHtml = '';
      const agentSubtasks = (state.subtasks || []).filter((st) => {
        const matchedRole = findMatchingRole(st.assignee || st.assigneeName);
        if (matchedRole && matchedRole.id === role.id) return true;
        const cleanSt = String(st.assignee || '').toLowerCase().replace(/[-_]/g, '');
        const cleanR = String(role.id || '').toLowerCase().replace(/[-_]/g, '');
        const cleanName = String(role.agent_name || '').toLowerCase().replace(/[-_]/g, '');
        return cleanSt === cleanR || cleanSt === cleanName || cleanSt === `agent${cleanR}`;
      });
      if (agentSubtasks.length) {
        const doneCount = agentSubtasks.filter((s) => ['COMPLETED', 'DONE'].includes(String(s.status).toUpperCase())).length;
        const latestSt = agentSubtasks[agentSubtasks.length - 1];
        subtasksHtml = `
          <div class="team-subtasks-box">
            <div class="team-subtasks-head">
              <span>📋 ${t('تسک‌های واگذارشده:')}</span>
              <span>${num(doneCount)} / ${num(agentSubtasks.length)} ${t('تکمیل')}</span>
            </div>
            <div style="color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">• ${escapeHtml(latestSt.title)}</div>
          </div>
        `;
      }

      const roleTitle = I18N.roleText(role, 'title', state.language);
      const roleSpecialty = I18N.roleText(role, 'specialty', state.language);
      const roleDesc = I18N.roleText(role, 'description', state.language);
      const stateBadge = isActive
        ? `<span class="team-state active"><i class="live-pulse-dot" aria-hidden="true"></i>${t('در حال اجرا')}</span>`
        : `<span class="team-state">${escapeHtml(t(role.id === 'main_agent' ? 'گفت‌وگوی اصلی' : (activeMatch?.status === 'PAUSED' ? 'متوقف‌شده' : 'آمادهٔ استفاده')))}</span>`;

      card.innerHTML = `
        <div class="team-card-head">
          <span class="team-avatar">
            <img src="${avatarSrc}" alt="${escapeHtml(roleTitle)}">
            <span class="team-avatar-icon" aria-hidden="true">${role.icon || '♧'}</span>
          </span>
          <div>
            <div class="team-role">${escapeHtml(roleTitle)}</div>
            <div class="team-specialty">${escapeHtml(roleSpecialty)}</div>
          </div>
          ${stateBadge}
        </div>
        <p class="team-description">${escapeHtml(roleDesc)}</p>
        ${taskHtml}
        ${subtasksHtml}
        ${collabHtml}
        ${recentToolHtml}
        <div class="team-skills" aria-label="${t('مهارت‌های')} ${escapeHtml(roleTitle)}">
          ${(role.skills || []).slice(0, 5).map((s) => {
            const skillLabel = state.language === 'en' ? (I18N.skillNames?.[s] || s.replaceAll('-', ' ')) : (skillLabels[s] || s);
            return `<span class="skill-chip" dir="auto">${escapeHtml(skillLabel)}</span>`;
          }).join('')}
        </div>
        <div class="team-card-actions">
          <button type="button" class="secondary-button agent-chat-btn" data-agent-name="${escapeHtml(role.agent_name || role.title || role.id)}" data-role-id="${escapeHtml(role.id)}">
            <span>💬</span>
            <span>${t('گفت‌وگو')}</span>
          </button>
          <button type="button" class="secondary-button agent-assign-btn" data-agent-id="${escapeHtml(role.agent_name || role.id)}" data-agent-name="${escapeHtml(roleTitle)}">
            <span>📋</span>
            <span>${t('واگذاری تسک')}</span>
          </button>
          <button type="button" class="secondary-button agent-actions-btn" data-agent-id="${escapeHtml(activeMatch?.id || role.id)}" data-agent-name="${escapeHtml(role.title || role.id)}">
            <span>⚡</span>
            <span>${t('اکشن‌ها')}</span>
          </button>
          <button type="button" class="secondary-button agent-toggle-btn ${isActive ? 'danger' : ''}" data-agent-id="${escapeHtml(activeMatch?.id || role.id)}" data-is-active="${isActive ? 'true' : 'false'}">
            <span>${isActive ? '⏸' : '▶'}</span>
            <span>${t(isActive ? 'توقف' : 'فعال‌سازی')}</span>
          </button>
        </div>
      `;

      // Direct chat button handler
      const chatBtn = card.querySelector('.agent-chat-btn');
      if (chatBtn) {
        chatBtn.addEventListener('click', () => {
          const targetName = chatBtn.dataset.agentName || role.title || role.id;
          setTab('conversations');
          const targetSelect = $('#composer-target-select');
          if (targetSelect) {
            targetSelect.value = role.agent_name || role.id;
            state.composerTarget = targetSelect.value;
          }
          renderLiveChatStrip();
          const textarea = $('#message-form textarea') || $('#message-form [name="text"]');
          if (textarea) {
            const prefix = `@${targetName}: `;
            if (!textarea.value.startsWith(prefix)) {
              textarea.value = prefix + textarea.value;
            }
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
          toast(`مکالمه با ${targetName} آغاز شد.`);
        });
      }

      // Direct assign subtask button handler
      const assignBtn = card.querySelector('.agent-assign-btn');
      if (assignBtn) {
        assignBtn.addEventListener('click', () => {
          const targetId = assignBtn.dataset.agentId || role.agent_name || role.id;
          const targetName = assignBtn.dataset.agentName || roleTitle;
          setTab('conversations');
          const targetSelect = $('#composer-target-select');
          if (targetSelect) {
            targetSelect.value = targetId;
            state.composerTarget = targetSelect.value;
          }
          const delegateChip = $('[data-composer-mode="delegate"]');
          if (delegateChip) delegateChip.click();
          const textarea = $('#message-form textarea') || $('#message-form [name="text"]');
          if (textarea) {
            textarea.placeholder = `شرح تسک و خروجی مورد انتظار برای ${targetName}…`;
            textarea.focus();
          }
          toast(`آمادهٔ واگذاری تسک به ${targetName}`);
        });
      }

      // View actions button handler
      const actionsBtn = card.querySelector('.agent-actions-btn');
      if (actionsBtn) {
        actionsBtn.addEventListener('click', () => {
          setTab('conversations');
          const viewActBtn = $('[data-chat-view="actions"]');
          if (viewActBtn) viewActBtn.click();
          toast(`مشاهده اکشن‌ها و ابزارهای ${roleTitle}`);
        });
      }

      // Toggle Pause/Resume button handler
      const toggleBtn = card.querySelector('.agent-toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', async () => {
          const agentId = toggleBtn.dataset.agentId;
          const currentlyActive = toggleBtn.dataset.isActive === 'true';
          const newStatus = currentlyActive ? 'PAUSED' : 'ACTIVE';
          try {
            await apiPost('/api/agent/update', {
              convId: state.activeConvId,
              id: agentId,
              status: newStatus,
            });
            toast(`وضعیت ${roleTitle} به «${t(newStatus === 'ACTIVE' ? 'فعال' : 'متوقف')}» تغییر یافت.`);
            pollStatus();
          } catch (err) {
            toast(err.message);
          }
        });
      }

      grid.append(card);
    }
  }

  function renderActivity() {
    const list = $('#activity-list');
    if (!list) return;

    const mLen = state.messages.length;
    const tLen = (state.telemetry.toolCalls || []).length;
    const lLen = (state.telemetry.terminalLogs || []).length;
    const bLen = (state.telemetry.backgroundTasks || []).length;
    const cLen = (state.collaborations || []).length;
    const actSig = `${mLen}:${tLen}:${lLen}:${bLen}:${cLen}:${state.language}`;
    if (actSig === signatures.activity) return;
    signatures.activity = actSig;

    list.replaceChildren();

    const events = [];
    for (let i = 0; i < state.messages.length; i++) {
      const msg = state.messages[i];
      const recipient = msg.recipientName || msg.recipient || msg.recipientCode;
      const isPeer = Boolean(recipient);
      let title = '';
      if (isPeer) {
        title = `🔄 ${msg.senderName || msg.senderRole || t('عامل')} ➔ ${recipient}`;
      } else {
        title = `${t('پیام')} · ${msg.senderName || msg.senderRole || t('عامل')}`;
      }
      let detail = msg.content || '';
      if (msg.thoughts) {
        detail = `[${t('فکر')}]: ${msg.thoughts} ${detail ? '— ' + detail : ''}`;
      }
      events.push({
        icon: isPeer ? '🔄' : '◈',
        title: title,
        detail: detail,
        time: msg.timestamp || '',
        _sortKey: getEventTimeValue(msg, i),
      });
    }
    for (let i = 0; i < (state.telemetry.toolCalls || []).length; i++) {
      const tool = state.telemetry.toolCalls[i];
      const agentLabel = tool.agentName || tool.agentId || 'Antigravity';
      events.push({
        icon: tool.status === 'ERROR' ? '⚠' : '⚡',
        title: `${t('اجرای ابزار')} · ${tool.tool} (${agentLabel})`,
        detail: `مرحله ${tool.stepIdx || 0} - ${ActivityHelper.statusLabel(tool.status, state.language)}${tool.output ? ' · ' + tool.output.slice(0, 100) : ''}`,
        time: tool.timestamp || '',
        _sortKey: getEventTimeValue(tool, i),
      });
    }
    for (let i = 0; i < (state.telemetry.terminalLogs || []).length; i++) {
      const log = state.telemetry.terminalLogs[i];
      events.push({
        icon: '⌨',
        title: `${t('فرمان ترمینال')} · ${log.command}`,
        detail: log.status || 'SUCCESS',
        time: log.timestamp || '',
        _sortKey: getEventTimeValue(log, i),
      });
    }
    for (let i = 0; i < (state.telemetry.backgroundTasks || []).length; i++) {
      const task = state.telemetry.backgroundTasks[i];
      events.push({
        icon: '⚙',
        title: `${t('فرمان پس‌زمینه')} · ${task.title || task.command || 'Task'}`,
        detail: `وضعیت: ${ActivityHelper.statusLabel(task.status, state.language)}${task.pid ? ` · PID: ${task.pid}` : ''}`,
        time: task.timestamp || '',
        _sortKey: getEventTimeValue(task, i),
      });
    }
    for (let i = 0; i < (state.collaborations || []).length; i++) {
      const col = state.collaborations[i];
      events.push({
        icon: '🔄',
        title: `${t('همکاری ساب‌ایجنت‌ها')} · ${col.from} ➔ ${col.to}`,
        detail: col.label || 'همکاری و مباحثه فعال',
        time: col.timestamp || '',
        _sortKey: getEventTimeValue(col, i),
      });
    }

    // Sort all events chronologically ascending, then reverse to render newest first
    events.sort((a, b) => a._sortKey - b._sortKey);

    const countEl = $('#activity-count');
    if (countEl) countEl.textContent = num(events.length);

    if (!events.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('هنوز گفت‌وگویی از این اتاق شروع نشده؛ پس رخداد زنده‌ای برای نمایش نیست.');
      list.append(empty);
      return;
    }

    // Newest first at top (descending chronological order)
    for (const ev of events.reverse()) {
      const row = document.createElement('article');
      row.className = 'event-row';
      row.innerHTML = `
        <span class="event-icon">${ev.icon}</span>
        <div class="event-content">
          <div class="event-title">${escapeHtml(ev.title)}</div>
          <div class="event-detail">${escapeHtml(ev.detail.slice(0, 200))}</div>
        </div>
        <time class="event-time">${escapeHtml(ev.time)}</time>
      `;
      list.append(row);
    }
  }

  function renderSettings() {
    const container = $('#round-limits');
    if (!container) return;

    const roleCaps = (state.thinkTank && state.thinkTank.roleCaps) || {};
    const settingsSig = `${state.roles.length}:${JSON.stringify(roleCaps)}:${state.language}`;
    if (settingsSig === signatures.settings) return;
    signatures.settings = settingsSig;

    container.replaceChildren();

    for (const cat of ['core', 'engineering', 'quality', 'specialist']) {
      const catRoles = state.roles.filter((r) => r.category === cat);
      if (!catRoles.length) continue;
      const details = document.createElement('details');
      details.className = 'limit-group';
      if (cat === 'core') details.open = true;
      details.innerHTML = `
        <summary style="cursor:pointer;padding:8px;font-weight:700;color:var(--text);display:flex;justify-content:space-between;">
          <span>${t(categoryLabels[cat])}</span>
          <small style="color:var(--muted);">${num(catRoles.length)} ${t('نقش')}</small>
        </summary>
      `;
      const rows = document.createElement('div');
      rows.className = 'limit-group-rows';
      rows.style.display = 'grid';
      rows.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
      rows.style.gap = '8px';
      rows.style.padding = '8px';

      for (const role of catRoles) {
        const val = roleCaps[role.id] ?? role.round_limit ?? 50;
        const row = document.createElement('div');
        row.className = 'limit-row';
        row.innerHTML = `
          <label for="limit-${role.id}">${escapeHtml(I18N.roleText(role, 'title', state.language))}</label>
          <input id="limit-${role.id}" name="${role.id}" type="number" min="1" max="500" value="${val}">
        `;
        rows.append(row);
      }
      details.append(rows);
      container.append(details);
    }
  }

  function renderProposalModal() {
    const dialog = $('#approval-dialog');
    if (!dialog) return;

    const p = state.proposal;
    const r = state.review;
    const modalSig = `${p?.id || 'none'}:${p?.status || ''}:${p?.userDecision?.action || ''}:${p?.userDecision?.optionId || ''}:${state.selectedProposalOption || ''}:${r?.confidence || ''}:${r?.status || ''}:${state.language}`;
    if (modalSig === signatures.modal) return;
    signatures.modal = modalSig;

    const isPendingProposal = state.proposal &&
      ['PROPOSED', 'AWAITING_APPROVAL', 'WAITING_APPROVAL', 'PENDING'].includes(String(state.proposal.status).toUpperCase()) &&
      !state.proposal.userDecision;

    if (isPendingProposal) {
      const title = $('#approval-title');
      const reason = $('#approval-reason');
      const questions = $('#approval-questions');
      const cmd = $('#approval-command');
      const actions = dialog.querySelector('.dialog-actions');

      if (title) title.textContent = state.proposal.title || t('طرح پیشنهادی اتاق فکر');
      if (reason) reason.textContent = `${state.proposal.author ? state.proposal.author + ' · ' : ''}${state.proposal.summary || ''}`;
      if (cmd) {
        cmd.textContent = '';
        cmd.classList.add('hidden');
      }

      let selectedOptionId = state.selectedProposalOption || state.proposal.userDecision?.optionId || null;

      if (questions) {
        questions.replaceChildren();
        const rawOpts = state.proposal.decisionOptions || state.proposal.options || [];
        if (rawOpts.length) {
          questions.classList.remove('hidden');
          const optList = document.createElement('div');
          optList.style.display = 'grid';
          optList.style.gap = '8px';
          optList.style.margin = '12px 0';

          for (let i = 0; i < rawOpts.length; i++) {
            const opt = rawOpts[i];
            const optId = typeof opt === 'object' && opt.id ? opt.id : `opt-${i + 1}`;
            const optLabel = typeof opt === 'object' && opt.label ? opt.label : String(opt);
            const isChosen = selectedOptionId === optId;

            const optBtn = document.createElement('button');
            optBtn.type = 'button';
            optBtn.className = `secondary-button${isChosen ? ' active' : ''}`;
            optBtn.style.textAlign = 'right';
            optBtn.style.padding = '8px 12px';
            optBtn.style.display = 'flex';
            optBtn.style.alignItems = 'center';
            optBtn.style.gap = '8px';
            optBtn.style.width = '100%';
            optBtn.innerHTML = `
              <span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid var(--accent);background:${isChosen ? 'var(--accent)' : 'transparent'};flex:none;"></span>
              <span style="font-size:12px;line-height:1.5;">${escapeHtml(optLabel)}</span>
            `;
            optBtn.addEventListener('click', async () => {
              try {
                selectedOptionId = optId;
                state.selectedProposalOption = optId;
                await apiPost('/api/proposal/action', {
                  convId: state.activeConvId,
                  action: 'select_option',
                  optionId: optId,
                  comment: optLabel,
                });
                toast(`گزینه «${optLabel}» انتخاب شد.`);
                renderProposalModal();
                pollStatus();
              } catch (err) {
                toast(err.message);
              }
            });
            optList.append(optBtn);
          }
          questions.append(optList);
        } else {
          questions.classList.add('hidden');
        }
      }

      if (actions) {
        actions.replaceChildren();

        // 1. Approve & Execute button
        const btnApprove = document.createElement('button');
        btnApprove.type = 'button';
        btnApprove.className = 'primary-button';
        btnApprove.textContent = t('تأیید و اجرا');
        btnApprove.addEventListener('click', async () => {
          try {
            await apiPost('/api/proposal/action', {
              convId: state.activeConvId,
              action: 'approve',
              optionId: selectedOptionId,
              comment: 'طرح توسط کاربر تأیید شد و دستور اجرای قطعی صادر شد.',
            });
            dialog.classList.add('hidden');
            toast('طرح با موفقیت تأیید شد و به فاز اجرا رفت.');
            pollStatus();
          } catch (err) {
            toast(err.message);
          }
        });

        // 2. Request Revision button
        const btnRevision = document.createElement('button');
        btnRevision.type = 'button';
        btnRevision.className = 'secondary-button';
        btnRevision.textContent = t('درخواست اصلاح');
        btnRevision.addEventListener('click', async () => {
          const comment = window.prompt(t('توضیحات اصلاح را وارد کنید (اختیاری):'));
          if (comment === null) return;
          const trimmedComment = comment.trim() || 'نیاز به بازنگری و چکش‌کاری مجدد طرح';
          try {
            await apiPost('/api/proposal/action', {
              convId: state.activeConvId,
              action: 'request_revision',
              comment: trimmedComment,
            });
            dialog.classList.add('hidden');
            toast('درخواست اصلاح برای ساب‌ایجنت‌ها ارسال شد.');
            pollStatus();
          } catch (err) {
            toast(err.message);
          }
        });

        // 3. Halt button
        const btnHalt = document.createElement('button');
        btnHalt.type = 'button';
        btnHalt.className = 'secondary-button';
        btnHalt.style.color = 'var(--danger, #f43f5e)';
        btnHalt.textContent = t('توقف نشست');
        btnHalt.addEventListener('click', async () => {
          if (!window.confirm(t('آیا از توقف کامل نشست اطمینان دارید؟'))) return;
          try {
            await apiPost('/api/proposal/action', {
              convId: state.activeConvId,
              action: 'halt',
              comment: 'توقف نشست توسط کاربر',
            });
            dialog.classList.add('hidden');
            toast('نشست متوقف شد.');
            pollStatus();
          } catch (err) {
            toast(err.message);
          }
        });

        // 4. Close dialog button
        const btnClose = document.createElement('button');
        btnClose.type = 'button';
        btnClose.className = 'secondary-button';
        btnClose.textContent = t('بستن');
        btnClose.addEventListener('click', () => {
          dialog.classList.add('hidden');
          dialog.dataset.dismissed = state.proposal?.id || 'true';
        });

        actions.append(btnApprove, btnRevision, btnHalt, btnClose);
      }
      if (dialog.dataset.dismissed !== (state.proposal?.id || 'true')) {
        dialog.classList.remove('hidden');
      }
      return;
    }

    if (state.review && state.review.status === 'WAITING_FOR_HUMAN') {
      const title = $('#approval-title');
      const reason = $('#approval-reason');
      const cmd = $('#approval-command');
      const actions = dialog.querySelector('.dialog-actions');

      if (title) title.textContent = t('بازبینی مدیریتی اتاق فکر');
      if (reason) {
        reason.textContent = `ضریب اطمینان: ${state.review.confidence}٪ (نیاز به تصمیم کاربر)\nمدیر: ${state.review.managerSummary || ''}\nعامل اصلی: ${state.review.mainSummary || ''}`;
      }
      if (cmd) {
        cmd.textContent = `پیشنهاد مدیر: ${state.review.managerRecommendation === 'continue' ? 'ادامهٔ کار' : 'پایان کار'}`;
        cmd.classList.remove('hidden');
      }

      if (actions) {
        actions.replaceChildren();
        const btnCont = document.createElement('button');
        btnCont.type = 'button';
        btnCont.className = 'primary-button';
        btnCont.textContent = t('ادامهٔ کار');
        btnCont.addEventListener('click', async () => {
          await apiPost('/api/governance/review_decision', { convId: state.activeConvId, decision: 'continue' });
          dialog.classList.add('hidden');
          toast('تصمیم ادامه کار ثبت شد.');
          pollStatus();
        });

        const btnStop = document.createElement('button');
        btnStop.type = 'button';
        btnStop.className = 'secondary-button';
        btnStop.textContent = t('توقف کار');
        btnStop.addEventListener('click', async () => {
          await apiPost('/api/governance/review_decision', { convId: state.activeConvId, decision: 'stop' });
          dialog.classList.add('hidden');
          toast('تصمیم توقف کار ثبت شد.');
          pollStatus();
        });

        const btnClose = document.createElement('button');
        btnClose.type = 'button';
        btnClose.className = 'secondary-button';
        btnClose.textContent = t('بستن');
        btnClose.addEventListener('click', () => {
          dialog.classList.add('hidden');
        });

        actions.append(btnCont, btnStop, btnClose);
      }
      dialog.classList.remove('hidden');
      return;
    }

    dialog.classList.add('hidden');
  }

  function refreshUI() {
    renderHostContext();
    renderOverview();
    renderConversationsRail();
    renderChat();
    renderTeam();
    renderActivity();
    renderSettings();
    renderProposalModal();
  }

  function applySnapshot(snapshot) {
    if (!snapshot) return;
    if (snapshot.thinkTank) {
      state.thinkTank = snapshot.thinkTank;
      state.project = snapshot.thinkTank.project || state.project;
      state.directive = snapshot.thinkTank.directive || state.directive;
      state.phase = snapshot.thinkTank.phase || state.phase;
      state.round = snapshot.thinkTank.round || state.round;
      state.maxRounds = snapshot.thinkTank.maxRounds || state.maxRounds;
      state.progress = snapshot.thinkTank.progress ?? state.progress;
      state.status = snapshot.thinkTank.status || state.status;
    }
    if (Array.isArray(snapshot.agents)) state.agents = snapshot.agents;
    if (Array.isArray(snapshot.messages)) {
      state.messages = snapshot.messages;
      state._msgVer = (state._msgVer || 0) + 1;
    }
    if (snapshot.telemetry) {
      state.telemetry = {
        toolCalls: snapshot.telemetry.toolCalls || [],
        terminalLogs: snapshot.telemetry.terminalLogs || [],
        backgroundTasks: snapshot.telemetry.backgroundTasks || [],
      };
    }
    if (Array.isArray(snapshot.conversationsList)) state.conversations = snapshot.conversationsList;
    if (snapshot.proposal !== undefined) state.proposal = snapshot.proposal;
    if (snapshot.review !== undefined) state.review = snapshot.review;
    if (Array.isArray(snapshot.collaborations)) state.collaborations = snapshot.collaborations;
    if (Array.isArray(snapshot.subtasks)) state.subtasks = snapshot.subtasks;
    refreshUI();
  }

  async function apiGet(path) {
    try {
      const res = await fetch(path, { headers: { 'Accept': 'application/json' } });
      if (res.ok) return await res.json();
    } catch (_) {}
    const backendUrl = `http://127.0.0.1:8780${path.startsWith('/api') ? path : '/api' + path}`;
    const res2 = await fetch(backendUrl, { headers: { 'Accept': 'application/json' } });
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    return res2.json();
  }

  async function apiPost(path, data) {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    const backendUrl = `http://127.0.0.1:8780${path.startsWith('/api') ? path : '/api' + path}`;
    const res2 = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res2.ok) {
      const body = await res2.json().catch(() => ({}));
      throw new Error(body.detail || body.error || `HTTP ${res2.status}`);
    }
    return res2.json();
  }

  function handleLiveEvent(data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'SYNC_READY') {
      setConnection(true);
    } else if (data.type === 'SYNC_SNAPSHOT') {
      applySnapshot(data.snapshot);
    } else if (data.type === 'SYNC_REPLAY' && Array.isArray(data.events)) {
      for (const ev of data.events) handleLiveEvent(ev);
    } else if (data.type === 'NEW_MESSAGE') {
      const msg = data.message || data;
      if (msg && (msg.content || msg.thoughts || msg.critique || msg.id)) {
        const existingIdx = state.messages.findIndex((m) => m.id && msg.id && m.id === msg.id);
        if (existingIdx !== -1) {
          state.messages[existingIdx] = Object.assign({}, state.messages[existingIdx], msg);
        } else {
          state.messages.push(msg);
        }
        state._msgVer = (state._msgVer || 0) + 1;
        renderChat();
        renderActivity();
        renderOverview();
      }
    } else if (data.type === 'AGENTS_UPDATE') {
      if (Array.isArray(data.agents)) {
        state.agents = data.agents;
        renderChat();
        renderTeam();
        renderOverview();
      }
    } else if (data.type === 'COLLABORATION_UPDATE') {
      if (Array.isArray(data.collaborations)) state.collaborations = data.collaborations;
      if (Array.isArray(data.agents)) state.agents = data.agents;
      if (data.message) {
        const msg = data.message;
        const existingIdx = state.messages.findIndex((m) => m.id && msg.id && m.id === msg.id);
        if (existingIdx !== -1) {
          state.messages[existingIdx] = Object.assign({}, state.messages[existingIdx], msg);
        } else {
          state.messages.push(msg);
        }
        state._msgVer = (state._msgVer || 0) + 1;
      }
      renderChat();
      renderTeam();
      renderActivity();
      renderOverview();
    } else if (data.type === 'STATE_UPDATE') {
      if (data.thinkTank) {
        Object.assign(state, {
          project: data.thinkTank.project || state.project,
          directive: data.thinkTank.directive || state.directive,
          phase: data.thinkTank.phase || state.phase,
          round: data.thinkTank.round || state.round,
          maxRounds: data.thinkTank.maxRounds || state.maxRounds,
          progress: data.thinkTank.progress ?? state.progress,
          status: data.thinkTank.status || state.status,
        });
      }
      refreshUI();
    } else if (data.type === 'PROPOSAL_UPDATE') {
      state.proposal = data.proposal;
      if (data.message) {
        const msg = data.message;
        const existingIdx = state.messages.findIndex((m) => m.id && msg.id && m.id === msg.id);
        if (existingIdx !== -1) state.messages[existingIdx] = Object.assign({}, state.messages[existingIdx], msg);
        else state.messages.push(msg);
        state._msgVer = (state._msgVer || 0) + 1;
      }
      if (Array.isArray(data.agents)) state.agents = data.agents;
      renderChat();
      renderTeam();
      renderProposalModal();
    } else if (data.type === 'SUBTASKS_UPDATE') {
      if (Array.isArray(data.subtasks)) state.subtasks = data.subtasks;
      if (Array.isArray(data.agents)) state.agents = data.agents;
      if (data.thinkTank) state.progress = data.thinkTank.progress ?? state.progress;
      if (data.message) {
        const msg = data.message;
        const existingIdx = state.messages.findIndex((m) => m.id && msg.id && m.id === msg.id);
        if (existingIdx !== -1) state.messages[existingIdx] = Object.assign({}, state.messages[existingIdx], msg);
        else state.messages.push(msg);
        state._msgVer = (state._msgVer || 0) + 1;
      }
      renderSubtasks();
      renderChat();
      renderTeam();
      renderOverview();
      renderActivity();
    } else if (data.type === 'REVIEW_UPDATE') {
      state.review = data.review;
      renderProposalModal();
    } else if (data.type === 'TELEMETRY_UPDATE' && data.telemetry) {
      state.telemetry = {
        toolCalls: data.telemetry.toolCalls || state.telemetry.toolCalls,
        terminalLogs: data.telemetry.terminalLogs || state.telemetry.terminalLogs,
        backgroundTasks: data.telemetry.backgroundTasks || state.telemetry.backgroundTasks,
      };
      renderActivity();
      renderTeam();
      renderChat();
      renderOverview();
    }
  }

  function connectWebSocket() {
    if (state.ws) {
      try {
        state.ws.onclose = null;
        state.ws.onerror = null;
        state.ws.close();
      } catch (_) {}
      state.ws = null;
    }
    clearTimeout(state.reconnectTimer);
    clearInterval(state.pingTimer);

    let wsUrl = `ws://127.0.0.1:8780/ws?convId=${encodeURIComponent(state.activeConvId || 'default')}`;
    if (state.projectId) wsUrl += `&projectId=${encodeURIComponent(state.projectId)}`;

    try {
      const ws = new WebSocket(wsUrl);
      state.ws = ws;

      ws.onopen = () => {
        setConnection(true);
        state.pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SYNC_PING', clientTime: Date.now() }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleLiveEvent(data);
        } catch (err) {
          console.warn('WS message parsing error:', err);
        }
      };

      ws.onclose = () => {
        clearInterval(state.pingTimer);
        setConnection(false);
        state.reconnectTimer = setTimeout(connectWebSocket, 4000);
      };

      ws.onerror = () => {
        try { ws.close(); } catch (_) {}
      };
    } catch (_) {
      setConnection(false);
      state.reconnectTimer = setTimeout(connectWebSocket, 4000);
    }
  }

  async function pollStatus() {
    if (!state.activeConvId) return;
    try {
      const data = await apiGet(`/api/status?convId=${encodeURIComponent(state.activeConvId)}`);
      setConnection(true);
      applySnapshot(data);
    } catch (err) {
      consecutivePollFailures += 1;
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        if (consecutivePollFailures >= 2) {
          setConnection(false, err.message);
        }
      }
    }
  }

  function switchConversation(convId) {
    if (!convId || convId === state.activeConvId) return;
    state.activeConvId = convId;
    state.messages = [];
    state.telemetry = { toolCalls: [], terminalLogs: [], backgroundTasks: [] };
    // Invalidate signatures on conversation switch
    for (const k in signatures) signatures[k] = '';
    renderConversationsRail();
    renderChat();
    connectWebSocket();
    pollStatus();
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bindUI() {
    // Thread Search Box in Sidebar
    const searchThreadsInput = $('#search-threads');
    if (searchThreadsInput) {
      searchThreadsInput.addEventListener('input', (e) => {
        state.threadSearchQuery = (e.target.value || '').trim().toLowerCase();
        signatures.rail = '';
        renderConversationsRail();
      });
    }

    // Topbar Quick Project Switcher Dropdown
    const projectChip = $('#current-project-chip');
    const projectDropdown = $('#project-picker-dropdown');
    if (projectChip && projectDropdown) {
      projectChip.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !projectDropdown.classList.contains('hidden');
        projectDropdown.classList.toggle('hidden', isOpen);
        projectChip.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });

      document.addEventListener('click', (e) => {
        if (!projectDropdown.classList.contains('hidden') && !e.target.closest('#project-quick-picker')) {
          projectDropdown.classList.add('hidden');
          projectChip.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Quick Jump Buttons to Current Host Conversation
    const jumpToCurrentBtns = [$('#picker-current-conv-btn'), $('#jump-to-current-btn')];
    jumpToCurrentBtns.forEach((btn) => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (state.hostConvId) {
            switchConversation(state.hostConvId);
          }
          if (projectDropdown) {
            projectDropdown.classList.add('hidden');
            if (projectChip) projectChip.setAttribute('aria-expanded', 'false');
          }
        });
      }
    });

        // Nav tabs
    $$('.primary-nav .nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        setTab(btn.dataset.tab);
      });
    });

    // Keyboard navigation on tabs
    const nav = $('.primary-nav');
    if (nav) {
      nav.addEventListener('keydown', (e) => {
        const tabs = $$('.primary-nav .nav-item');
        const activeIdx = tabs.findIndex((t) => t.classList.contains('active'));
        if (activeIdx === -1) return;
        let nextIdx = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (activeIdx + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (activeIdx - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') nextIdx = 0;
        if (e.key === 'End') nextIdx = tabs.length - 1;
        if (nextIdx !== -1) {
          e.preventDefault();
          tabs[nextIdx].focus();
          setTab(tabs[nextIdx].dataset.tab);
        }
      });
    }

    // Language toggle
    const langToggle = $('#language-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        setLanguage(state.language === 'en' ? 'fa' : 'en');
      });
    }

    // Theme toggle
    const themeBtn = $('#theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    // Role category filters
    $$('[data-role-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.roleCategory = btn.dataset.roleCategory;
        signatures.team = '';
        renderTeam();
      });
    });

    // Chat view controls (messages, subtasks, actions)
    $$('[data-chat-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.chatView = btn.dataset.chatView;
        $$('[data-chat-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.chatView === state.chatView ? 'true' : 'false'));
        signatures.chat = '';
        signatures.chatActivity = '';
        signatures.subtasks = '';
        renderChat();
      });
    });

    // Overview Subtasks Form & Toggle
    const toggleSubtaskBtn = $('#toggle-assign-subtask');
    const assignSubtaskForm = $('#assign-subtask-form');
    if (toggleSubtaskBtn && assignSubtaskForm) {
      toggleSubtaskBtn.addEventListener('click', () => {
        assignSubtaskForm.classList.toggle('hidden');
        if (!assignSubtaskForm.classList.contains('hidden')) {
          const titleInp = assignSubtaskForm.elements.title;
          if (titleInp) titleInp.focus();
        }
      });
    }
    if (assignSubtaskForm) {
      assignSubtaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = (assignSubtaskForm.elements.title.value || '').trim();
        const assignee = assignSubtaskForm.elements.assignee.value || 'team-manager';
        const priority = assignSubtaskForm.elements.priority.value || 'NORMAL';
        const deliverable = (assignSubtaskForm.elements.deliverable.value || '').trim();
        if (!title || !state.activeConvId) return;

        try {
          await apiPost('/api/subtasks/upsert', {
            convId: state.activeConvId,
            title: title,
            assignee: assignee,
            assignedBy: 'کاربر (فرمانده نشست)',
            status: 'ASSIGNED',
            priority: priority,
            deliverable: deliverable,
          });
          assignSubtaskForm.reset();
          assignSubtaskForm.classList.add('hidden');
          toast(`تسک «${title.slice(0, 35)}» به ${assignee} واگذار شد.`);
          pollStatus();
        } catch (err) {
          toast(`خطا در ثبت تسک: ${err.message}`);
        }
      });
    }

    // Composer Orchestration Bar (Target Select + Mode Chips)
    const targetSelect = $('#composer-target-select');
    if (targetSelect) {
      targetSelect.addEventListener('change', () => {
        state.composerTarget = targetSelect.value || '';
        renderLiveChatStrip();
      });
    }

    const modePlaceholders = {
      message: 'پیام بعدی را بنویس…',
      delegate: 'عنوان و شرح تسک برای واگذاری به ساب‌ایجنت انتخاب‌شده…',
      critique: 'نقد فنی، ریسک یا چالش معماری را وارد کن…',
      question: 'پرسش فنی یا ابهامی که نیاز به شفاف‌سازی دارد…',
      vote: 'جمع‌بندی رأی و نظر شورا دربارهٔ طرح فعلی…',
    };

    $$('[data-composer-mode]').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.composerMode = chip.dataset.composerMode || 'message';
        $$('[data-composer-mode]').forEach((c) => {
          const isCurrent = c.dataset.composerMode === state.composerMode;
          c.classList.toggle('active', isCurrent);
          c.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
        });
        const textarea = $('#message-form textarea') || $('#message-form [name="text"]');
        if (textarea) {
          textarea.placeholder = t(modePlaceholders[state.composerMode] || modePlaceholders.message);
          textarea.focus();
        }
      });
    });

    // Message Composer
    const msgForm = $('#message-form');
    if (msgForm) {
      msgForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = msgForm.elements.text;
        const text = (textarea.value || '').trim();
        if (!text || !state.activeConvId) return;
        textarea.value = '';

        const targetId = state.composerTarget || (targetSelect ? targetSelect.value : '');
        const mode = state.composerMode || 'message';
        const matchedTargetRole = findMatchingRole(targetId);
        const targetLabel = matchedTargetRole ? I18N.roleText(matchedTargetRole, 'title', state.language) : targetId;

        try {
          if (mode === 'delegate') {
            const assignee = targetId || 'team-manager';
            await apiPost('/api/subtasks/upsert', {
              convId: state.activeConvId,
              title: text,
              assignee: assignee,
              assigneeName: targetLabel || assignee,
              assignedBy: 'کاربر / اتاق فکر',
              status: 'ASSIGNED',
              priority: 'HIGH',
              deliverable: 'گزارش اجرایی و شواهد تست در چت‌روم',
            });
            toast(`تسک به ${targetLabel || assignee} واگذار شد.`);
          } else if (mode === 'vote') {
            const voter = targetId || 'team-manager';
            await apiPost('/api/proposal/vote', {
              convId: state.activeConvId,
              voterId: voter,
              voterName: targetLabel || 'عضو شورا',
              stance: 'APPROVE',
              confidence: 95,
              comment: text,
            });
            toast('رأی و نظر شورا در کارت تصمیم‌گیری ثبت شد.');
          } else {
            // Standard message, critique, or question
            const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            await apiPost('/api/chat/send', {
              id: msgId,
              timestamp: timeStr,
              convId: state.activeConvId,
              channel: targetId ? 'SUBAGENTS' : 'operator',
              senderCode: 'USER',
              senderName: 'کاربر',
              senderRole: 'کاربر',
              recipient: targetId || undefined,
              recipientName: targetLabel || undefined,
              content: text,
              critique: mode === 'critique' ? text : undefined,
              question: mode === 'question' ? text : undefined,
              isOperator: true,
            });
          }

          // Dispatch to Antigravity Host Prompt
          const hostPrompt = targetId ? `@${targetId} [${mode.toUpperCase()}]: ${text}` : text;
          await apiPost('/api/host/send-message', {
            convId: state.activeConvId,
            prompt: hostPrompt,
          }).catch((err) => console.warn('Host prompt dispatch warning:', err));

          pollStatus();
        } catch (err) {
          toast(`خطا در ارسال: ${err.message}`);
        }
      });
    }

    // Interrupt Button
    const interruptBtn = $('#interrupt-thread');
    if (interruptBtn) {
      interruptBtn.addEventListener('click', async () => {
        if (!confirm(t('کار فعال این گفت‌وگو متوقف شود؟'))) return;
        try {
          await apiPost('/api/governance/review_decision', {
            convId: state.activeConvId,
            decision: 'stop',
          });
          toast('درخواست توقف ارسال شد.');
        } catch (err) {
          toast(err.message);
        }
      });
    }

    // Task / New Thread Form
    const taskForm = $('#create-thread-form');
    if (taskForm) {
      taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = (taskForm.elements.title.value || '').trim();
        const directive = (taskForm.elements.task.value || '').trim();
        if (!directive) return;

        try {
          await apiPost('/api/task/update', {
            convId: state.activeConvId,
            project: title || state.project || 'پروژه جدید',
            directive: directive,
            status: 'ACTIVE',
            phase: 'هم‌اندیشی و اجرا',
          });
          toast('دستور کار اتاق فکر به‌روزرسانی شد.');
          setTab('conversations');
        } catch (err) {
          const errEl = $('#create-error');
          if (errEl) errEl.textContent = err.message;
        }
      });
    }

    // Settings Form
    const settingsForm = $('#round-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roleCaps = {};
        for (const input of settingsForm.querySelectorAll('input[type=number]')) {
          roleCaps[input.name] = Number(input.value) || 50;
        }
        try {
          await apiPost('/api/task/update', {
            convId: state.activeConvId,
            roleCaps: roleCaps,
          });
          const st = $('#settings-status');
          if (st) st.textContent = t('سقف دورهای نقش‌ها ذخیره شد.');
          toast('سقف دورهای نقش‌ها به‌روز شد.');
        } catch (err) {
          toast(err.message);
        }
      });
    }

    // Navigation buttons
    const newThreadBtn = $('#new-thread');
    if (newThreadBtn) newThreadBtn.addEventListener('click', () => setTab('overview'));
    $$('[data-action="new-thread"]').forEach((b) => b.addEventListener('click', () => setTab('overview')));
    const hostContextBtn = $('#host-context-open-conversations');
    if (hostContextBtn) hostContextBtn.addEventListener('click', () => setTab('conversations'));

    // Approval Dialog base actions
    const approvalAccept = $('#approval-accept');
    if (approvalAccept) {
      approvalAccept.addEventListener('click', () => {
        const dialog = $('#approval-dialog');
        if (dialog) dialog.classList.add('hidden');
        toast(t('اجازه برای درخواست جاری ثبت شد.'));
      });
    }
    const approvalDecline = $('#approval-decline');
    if (approvalDecline) {
      approvalDecline.addEventListener('click', () => {
        const dialog = $('#approval-dialog');
        if (dialog) dialog.classList.add('hidden');
        toast(t('درخواست رد شد.'));
      });
    }
  }

  async function boot() {
    bindUI();
    applyTheme(state.theme);
    setLanguage(state.language);

    // 1. Resolve Active Conversation ID
    const urlParams = new URLSearchParams(window.location.search);
    const paramConvId = urlParams.get('convId') || urlParams.get('host_thread_id');
    
    let detectedHostCid = window.__ANTIGRAVITY_HOST_CONTEXT__?.conversationId || window.sidecar?.conversationId;
    if (!detectedHostCid) {
      try {
        const ctx = await apiGet('/api/host/context');
        if (ctx && ctx.conversationId) detectedHostCid = ctx.conversationId.trim();
      } catch (_) {}
    }
    
    state.hostConvId = detectedHostCid ? detectedHostCid.trim() : null;
    
    if (paramConvId) {
      state.activeConvId = paramConvId.trim();
    } else if (state.hostConvId) {
      state.activeConvId = state.hostConvId;
    } else {
      try {
        const statusData = await apiGet('/api/status');
        if (statusData && statusData.convId) {
          state.activeConvId = statusData.convId;
        }
      } catch (_) {}
    }
    if (!state.activeConvId) {
      state.activeConvId = '578e8764-3916-48c1-802f-9b5df9f06f03';
    }

        // 2. Load Roles Catalog
    try {
      const rolesData = await apiGet('/api/roles');
      if (Array.isArray(rolesData.roles)) {
        state.roles = rolesData.roles;
        renderTeam();
        renderSettings();
      }
    } catch (err) {
      console.warn('Could not load roles:', err);
    }

    // 3. Connect Live Real-time WebSocket
    connectWebSocket();

    // 4. Initial HTTP fetch & Periodic Fallback Poll (reduced frequency when WS is healthy)
    pollStatus();
    state.pollTimer = setInterval(() => {
      // If WebSocket is actively connected, background polling only needs to run every 12 seconds
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        // Every 4th tick (~12s)
        state._pollCount = (state._pollCount || 0) + 1;
        if (state._pollCount % 4 === 0) {
          pollStatus();
        }
      } else {
        pollStatus();
      }
    }, 3000);

    // 5. Hash navigation
    const initialTab = (window.location.hash || '').replace('#', '').trim();
    if (['overview', 'conversations', 'team', 'activity', 'settings'].includes(initialTab)) {
      setTab(initialTab);
    }
    window.addEventListener('hashchange', () => {
      const hTab = (window.location.hash || '').replace('#', '').trim();
      if (['overview', 'conversations', 'team', 'activity', 'settings'].includes(hTab)) {
        setTab(hTab);
      }
    });
  }

  window.ThinkTankState = state;
  window.renderProposalModal = renderProposalModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
