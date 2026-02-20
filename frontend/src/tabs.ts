// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { Editor } from './editor/init';
import { mostRecentExample } from './examples/init';

// ── Types ────────────────────────────────────────────────────────────────

interface TabState {
  id: string;
  name: string;
  uri: string;
  content: string;
}

interface TabsState {
  tabs: TabState[];
  activeTabId: string;
  nextId: number;
}

// ── Constants ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'QLeverUI tabs';
const DEFAULT_URI = 'query.rq';
const SAVE_DEBOUNCE_MS = 500;

// ── Module state ─────────────────────────────────────────────────────────

let state: TabsState;
let tabBar: HTMLElement;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// ── Persistence ──────────────────────────────────────────────────────────

function saveState(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(): TabsState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.tabs?.length > 0 && parsed.activeTabId && parsed.nextId) {
      return parsed as TabsState;
    }
  } catch {
    console.warn(
      `Corrupted tab data in localStorage ("${STORAGE_KEY}"). ` +
      `Run localStorage.removeItem("${STORAGE_KEY}") in the console to reset.`,
    );
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          type: 'warning',
          message: `Corrupted tab data. Run localStorage.removeItem("${STORAGE_KEY}") in the console to reset.`,
        },
      }),
    );
  }
  return null;
}

function debouncedSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, SAVE_DEBOUNCE_MS);
}

// ── Tab operations ───────────────────────────────────────────────────────

function activeTab(): TabState {
  return state.tabs.find((t) => t.id === state.activeTabId)!;
}

function makeTabId(n: number): string {
  return `tab-${n}`;
}

function makeTabUri(id: string): string {
  return `${id}.rq`;
}

function nextQueryName(): string {
  const used = new Set(
    state.tabs
      .map((t) => t.name.match(/^Query (\d+)$/))
      .filter(Boolean)
      .map((m) => Number(m![1]))
  );
  let n = 1;
  while (used.has(n)) n++;
  return `Query ${n}`;
}

async function switchTab(editor: Editor, tabId: string): Promise<void> {
  if (tabId === state.activeTabId) return;

  // Save current tab's content.
  const current = activeTab();
  current.content = editor.getContent();

  // Activate new tab.
  state.activeTabId = tabId;
  const next = activeTab();

  await editor.editorApp.updateCodeResources({
    modified: { uri: next.uri, text: next.content },
  });

  saveState();
  renderTabBar(editor);
  editor.focus();
}

async function createTab(editor: Editor, name?: string, content?: string): Promise<void> {
  // Save current tab content first.
  activeTab().content = editor.getContent();

  const id = makeTabId(state.nextId);
  const tab: TabState = {
    id,
    name: name ?? nextQueryName(),
    uri: makeTabUri(id),
    content: content ?? '',
  };
  state.nextId++;
  state.tabs.push(tab);
  state.activeTabId = id;

  await editor.editorApp.updateCodeResources({
    modified: { uri: tab.uri, text: tab.content },
  });

  saveState();
  renderTabBar(editor);
  editor.focus();
}

async function closeTab(editor: Editor, tabId: string): Promise<void> {
  if (state.tabs.length <= 1) return;

  const idx = state.tabs.findIndex((t) => t.id === tabId);
  if (idx === -1) return;

  state.tabs.splice(idx, 1);

  if (state.activeTabId === tabId) {
    // Switch to neighbor: prefer the tab to the right, fall back to the left.
    const newIdx = Math.min(idx, state.tabs.length - 1);
    state.activeTabId = state.tabs[newIdx].id;
    const next = activeTab();

    await editor.editorApp.updateCodeResources({
      modified: { uri: next.uri, text: next.content },
    });

    editor.focus();
  }

  saveState();
  renderTabBar(editor);
}

function renameTab(tabId: string, name: string): void {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const trimmed = name.trim();
  if (trimmed) tab.name = trimmed;
  saveState();
}

// ── Tab bar rendering ────────────────────────────────────────────────────

function renderTabBar(editor: Editor): void {
  tabBar.innerHTML = '';

  for (const tab of state.tabs) {
    const isActive = tab.id === state.activeTabId;
    const el = document.createElement('div');
    el.className = `group flex items-center gap-1 px-3 py-1.5 cursor-pointer select-none whitespace-nowrap border-b-2 transition-colors ${isActive
      ? 'border-green-500 font-bold text-gray-900 dark:text-gray-100'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
      }`;

    // Tab name (double-click to rename).
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-sm';
    nameSpan.textContent = tab.name;
    nameSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startRename(editor, tab, nameSpan);
    });
    el.appendChild(nameSpan);

    // Close button (hidden on last tab).
    if (state.tabs.length > 1) {
      const closeBtn = document.createElement('button');
      closeBtn.className =
        'opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs leading-none transition-opacity';
      closeBtn.innerHTML = '&#x2715;';
      closeBtn.title = 'Close tab';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(editor, tab.id);
      });
      // Also show close button on active tab always.
      if (isActive) closeBtn.classList.replace('opacity-0', 'opacity-60');
      el.appendChild(closeBtn);
    }

    // Click to switch.
    el.addEventListener('click', () => switchTab(editor, tab.id));

    // Middle-click to close.
    el.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(editor, tab.id);
      }
    });

    tabBar.appendChild(el);
  }

  // "+" button to add new tab.
  const addBtn = document.createElement('button');
  addBtn.className =
    'px-2.5 py-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-sm transition-colors';
  addBtn.textContent = '+';
  addBtn.title = 'New tab';
  addBtn.addEventListener('click', () => createTab(editor));
  tabBar.appendChild(addBtn);
}

function startRename(editor: Editor, tab: TabState, nameSpan: HTMLSpanElement): void {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = tab.name;
  input.className =
    'text-sm bg-transparent border-b border-gray-400 dark:border-gray-500 outline-none w-24 text-gray-900 dark:text-gray-100';

  const commit = () => {
    renameTab(tab.id, input.value);
    renderTabBar(editor);
  };
  const cancel = () => renderTabBar(editor);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', commit);

  nameSpan.replaceWith(input);
  input.focus();
  input.select();
}

// ── Public API ───────────────────────────────────────────────────────────

export async function openOrCreateTab(editor: Editor, name: string, content: string): Promise<void> {
  const existing = state.tabs.find((t) => t.name === name && t.content === content);
  if (existing) {
    await switchTab(editor, existing.id);
  } else {
    await createTab(editor, name, content);
  }
}

export function switchToNextTab(): void {
  alert("foo");
  if (!editorRef || state.tabs.length <= 1) return;
  const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
  switchTab(editorRef, state.tabs[(idx + 1) % state.tabs.length].id);
}

export function switchToPrevTab(): void {
  if (!editorRef || state.tabs.length <= 1) return;
  const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
  switchTab(editorRef, state.tabs[(idx - 1 + state.tabs.length) % state.tabs.length].id);
}

export function renameActiveTab(name: string): void {
  const tab = activeTab();
  if (!tab) return;
  const trimmed = name.trim();
  if (trimmed) tab.name = trimmed;
  saveState();
  if (tabBar) renderTabBar(editorRef!);
}

let editorRef: Editor | null = null;

// ── Setup ────────────────────────────────────────────────────────────────

export function setupTabs(editor: Editor): void {
  editorRef = editor;

  // Build tab bar element.
  tabBar = document.createElement('div');
  tabBar.id = 'tabBar';
  tabBar.className = 'flex items-center overflow-x-auto no-scrollbar mb-1';

  const editorContainer = document.getElementById('editorContainer');
  if (!editorContainer) return;
  editorContainer.insertBefore(tabBar, editorContainer.firstChild);

  // Restore or initialize state.
  const saved = loadState();
  if (saved) {
    state = saved;
    // Restore the active tab's content into the editor.
    const tab = activeTab();
    editor.setContent(tab.content);
    // Switch URI if it differs from the default.
    if (tab.uri !== DEFAULT_URI) {
      editor.editorApp.updateCodeResources({
        modified: { uri: tab.uri, text: tab.content },
      });
    }
  } else {
    // Default: single tab using the existing model URI.
    state = {
      tabs: [
        {
          id: makeTabId(1),
          name: 'Query 1',
          uri: DEFAULT_URI,
          content: editor.getContent(),
        },
      ],
      activeTabId: makeTabId(1),
      nextId: 2,
    };
  }

  renderTabBar(editor);

  // Track content changes with debounced persistence.
  const monacoEditor = editor.editorApp.getEditor()!;
  monacoEditor.onDidChangeModelContent(() => {
    activeTab().content = monacoEditor.getValue();
    debouncedSave();
  });

  // Rename active tab when an example is loaded.
  document.addEventListener('example-selected', () => {
    if (mostRecentExample) {
      renameActiveTab(mostRecentExample.name);
    }
  });

  // Save on page unload.
  window.addEventListener('beforeunload', () => {
    activeTab().content = editor.getContent();
    saveState();
  });
}
