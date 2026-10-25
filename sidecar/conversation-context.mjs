const BASE_KEY = 'thinktank.activeConversation';
const THEME_KEY = 'thinktank.theme';
const MAIN_TAB_KEY = 'thinktank.mainTab';
const LANGUAGE_KEY = 'thinktank.language';

export const MAIN_TABS = Object.freeze([
  'overview',
  'team',
  'conversations',
  'activity',
  'decisions',
  'settings',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStoredValue(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStoredValue(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Keep the in-memory preference when browser storage is unavailable.
  }
}

export function resolveConversationContext(search, storage) {
  const params = new URLSearchParams(search || '');
  const hostConversationId = nonEmpty(params.get('conversationId'));
  const explicitConversationId = nonEmpty(params.get('convId'));
  const projectId = nonEmpty(params.get('projectId'));
  const hostScope = hostConversationId ? `host:${hostConversationId}` : 'hostless';
  const storageScope = projectId ? `project:${projectId}:${hostScope}` : hostConversationId ? hostScope : 'standalone';
  const storageKey = `${BASE_KEY}:${encodeURIComponent(storageScope)}`;
  const savedConversationId = hostConversationId || projectId ? nonEmpty(readStoredValue(storage, storageKey)) : null;

  return {
    projectId,
    hostConversationId,
    explicitConversationId,
    storageKey,
    activeConversationId: explicitConversationId || savedConversationId || hostConversationId,
  };
}

export function rememberConversation(context, conversationId, storage) {
  const value = nonEmpty(conversationId);
  if (!value || !context?.storageKey) return;
  writeStoredValue(storage, context.storageKey, value);
}

export function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light';
}

export function readTheme(storage) {
  try {
    return normalizeTheme(readStoredValue(storage, THEME_KEY));
  } catch {
    return 'light';
  }
}

export function saveTheme(storage, value) {
  const theme = normalizeTheme(value);
  try {
    writeStoredValue(storage, THEME_KEY, theme);
  } catch {
    // Keep the in-memory choice even when browser storage is unavailable.
  }
  return theme;
}

export function normalizeMainTab(value) {
  return MAIN_TABS.includes(value) ? value : 'overview';
}

export function readMainTab(storage) {
  try {
    return normalizeMainTab(readStoredValue(storage, MAIN_TAB_KEY));
  } catch {
    return 'overview';
  }
}

export function saveMainTab(storage, value) {
  const tab = normalizeMainTab(value);
  try {
    writeStoredValue(storage, MAIN_TAB_KEY, tab);
  } catch {
    // The tab still changes for this page even if storage is unavailable.
  }
  return tab;
}

export function readLanguage(storage) {
  return readStoredValue(storage, LANGUAGE_KEY) === 'en' ? 'en' : 'fa';
}

export function saveLanguage(storage, value) {
  const language = value === 'en' ? 'en' : 'fa';
  writeStoredValue(storage, LANGUAGE_KEY, language);
  return language;
}

export function shouldFollowMessageFeed(scrollTop, clientHeight, scrollHeight, threshold = 48) {
  const remaining = Number(scrollHeight) - Number(scrollTop) - Number(clientHeight);
  return !Number.isFinite(remaining) || remaining <= Math.max(0, Number(threshold) || 0);
}

export function getMainTabStates(value) {
  const selected = normalizeMainTab(value);
  return MAIN_TABS.map((id) => ({
    id,
    selected: id === selected,
    hidden: id !== selected,
    tabIndex: id === selected ? 0 : -1,
  }));
}

export function stepMainTab(current, delta) {
  const index = MAIN_TABS.indexOf(normalizeMainTab(current));
  const offset = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  return MAIN_TABS[(index + offset % MAIN_TABS.length + MAIN_TABS.length) % MAIN_TABS.length];
}

export function applyTheme(document, value) {
  const theme = normalizeTheme(value);
  document.documentElement.dataset.theme = theme;
  if (document.body) document.body.dataset.theme = theme;
  return theme;
}
