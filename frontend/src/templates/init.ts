// NOTE: Template editor panel lifecycle — open/close, selector, and LS communication.

import * as monaco from 'monaco-editor';
import { apiFetch, clearApiKey, getApiKey } from '../api';
import { executeQuery } from '../buttons/execute';
import { applyPanelWidth, toggleWideMode } from '../buttons/wide_mode';
import type { Editor } from '../editor/init';
import { openOrCreateTab } from '../tabs/operations';
import type { QlueLsServiceConfig } from '../types/backend';
import { type CompletionRun, clearRuns, getRuns } from './runs';

const DEBOUNCE_MS = 300;

const TEMPLATE_GROUPS: { label: string; keys: { key: QueryTemplate; display: string }[] }[] = [
  { label: 'Subject', keys: [{ key: 'subjectCompletion', display: 'Subject' }] },
  {
    label: 'Predicate',
    keys: [
      { key: 'predicateCompletionContextSensitive', display: 'Predicate (ctx)' },
      { key: 'predicateCompletionContextInsensitive', display: 'Predicate' },
    ],
  },
  {
    label: 'Object',
    keys: [
      { key: 'objectCompletionContextSensitive', display: 'Object (ctx)' },
      { key: 'objectCompletionContextInsensitive', display: 'Object' },
    ],
  },
  {
    label: 'Values',
    keys: [
      { key: 'valuesCompletionContextSensitive', display: 'Values (ctx)' },
      { key: 'valuesCompletionContextInsensitive', display: 'Values' },
    ],
  },
  { label: 'Hover', keys: [{ key: 'hover', display: 'Hover' }] },
];

type QueryTemplate =
  | 'subjectCompletion'
  | 'predicateCompletionContextSensitive'
  | 'predicateCompletionContextInsensitive'
  | 'objectCompletionContextSensitive'
  | 'objectCompletionContextInsensitive'
  | 'valuesCompletionContextSensitive'
  | 'valuesCompletionContextInsensitive'
  | 'hover';

const ACTIVE_BUTTON_CLASS =
  'px-2 py-0.5 rounded cursor-pointer border border-green-600 bg-green-600 text-white';
const INACTIVE_BUTTON_CLASS =
  'px-2 py-0.5 rounded cursor-pointer border border-button-border hover:bg-button-hover';

let templateEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let editorRef: Editor | null = null;
let activeView: 'template' | 'runs' = 'template';
let activeKey: QueryTemplate | null = null;
let currentConfig: QlueLsServiceConfig | null = null;
let debounceTimer: number | undefined;
let changeListener: monaco.IDisposable | null = null;

/** Registers the close/save buttons and backend-switch listener for the templates editor. */
export function setupTemplatesEditor(editor: Editor) {
  editorRef = editor;

  document.getElementById('templatePanelClose')!.addEventListener('click', () => {
    closeTemplatesEditor();
    editor.focus();
  });

  document.getElementById('templatePanelSave')!.addEventListener('click', () => {
    saveTemplates();
  });

  document.getElementById('templateViewTemplate')!.addEventListener('click', () => {
    showView('template');
  });

  document.getElementById('templateViewRuns')!.addEventListener('click', () => {
    showView('runs');
  });

  document.getElementById('templateRunsClear')!.addEventListener('click', () => {
    clearRuns();
  });

  document.addEventListener('completion-run-logged', () => {
    updateRunsBadge();
    if (templateEditor && activeView === 'runs') renderRuns();
  });

  document.addEventListener('backend-selected', () => {
    if (templateEditor) {
      closeTemplatesEditor();
    }
  });

  updateRunsBadge();
}

/** Switches the panel body between the template editor and the completion query history. */
function showView(view: 'template' | 'runs') {
  activeView = view;

  const selector = document.getElementById('templateSelector')!;
  const editorContainer = document.getElementById('templateEditorContainer')!;
  const runsContainer = document.getElementById('templateRunsContainer')!;

  selector.classList.toggle('hidden', view === 'runs');
  selector.classList.toggle('flex', view === 'template');
  editorContainer.classList.toggle('hidden', view === 'runs');
  runsContainer.classList.toggle('hidden', view === 'template');
  runsContainer.classList.toggle('flex', view === 'runs');

  document.getElementById('templateViewTemplate')!.className =
    view === 'template' ? ACTIVE_BUTTON_CLASS : INACTIVE_BUTTON_CLASS;
  document.getElementById('templateViewRuns')!.className =
    view === 'runs' ? ACTIVE_BUTTON_CLASS : INACTIVE_BUTTON_CLASS;

  if (view === 'template') {
    templateEditor?.layout();
  } else {
    renderRuns();
  }
}

function updateRunsBadge() {
  const badge = document.getElementById('templateRunsBadge')!;
  const count = getRuns().length;
  badge.textContent = String(count);
  badge.classList.toggle('hidden', count === 0);
}

/** Opens the templates editor panel, fetches current backend config, and creates the editor. */
export async function openTemplatesEditor(editor: Editor) {
  if (templateEditor) return;

  const panel = document.getElementById('templatePanel')!;

  // NOTE: Fetch current backend config from the language server.
  // sendRequest returns the result directly; errors are thrown as exceptions.
  let config: QlueLsServiceConfig;
  try {
    config = (await editor.languageClient.sendRequest(
      'qlueLs/getBackend',
      {}
    )) as QlueLsServiceConfig;
  } catch (err) {
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          type: 'error',
          message: `Failed to fetch backend config: ${err}`,
          duration: 3000,
        },
      })
    );
    return;
  }

  currentConfig = config;

  // NOTE: Widen the parent container to make room for the template panel.
  applyPanelWidth();

  panel.classList.remove('hidden');
  panel.classList.add('flex');

  // NOTE: Let the layout settle, then relayout Monaco.
  setTimeout(() => editor.editorApp.getEditor()?.layout(), 50);

  // NOTE: Create standalone Monaco editor for template editing.
  const editorContainer = document.getElementById('templateEditorContainer')!;
  templateEditor = monaco.editor.create(editorContainer, {
    language: 'sparql',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    links: false,
    fontSize: 13,
    theme: document.getElementById('theme-switch')
      ? (document.getElementById('theme-switch') as HTMLInputElement).checked
        ? 'QleverUiThemeDark'
        : 'QleverUiThemeLight'
      : undefined,
  });

  buildSelector(editor);
  selectTemplate(TEMPLATE_GROUPS[0].keys[0].key, editor);
  showView('template');
}

/** Maps a tera template name (`"<backend>-<key>"`) to the label used in the selector. */
function templateDisplayName(template: string): string {
  for (const group of TEMPLATE_GROUPS) {
    for (const { key, display } of group.keys) {
      if (template === key || template.endsWith(`-${key}`)) return display;
    }
  }
  return template;
}

function formatAge(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function renderRuns() {
  const list = document.getElementById('templateRunsList')!;
  list.replaceChildren();

  const runs = getRuns();
  if (runs.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'p-3 text-gray-500 dark:text-gray-400';
    empty.textContent = 'No completion queries yet. Trigger a completion in the editor.';
    list.appendChild(empty);
    return;
  }

  for (const run of runs) {
    list.appendChild(renderRun(run));
  }
}

function renderRun(run: CompletionRun): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'border-b border-gray-200 dark:border-gray-700';

  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-button-hover';

  const name = document.createElement('span');
  name.className = 'font-semibold';
  name.textContent = templateDisplayName(run.template);

  const status = document.createElement('span');
  if (run.error === undefined && run.resultCount !== undefined) {
    status.className = 'text-green-600';
    status.textContent = `${run.resultCount} results`;
    status.title = 'Bindings returned by the endpoint, before search term filtering';
  } else {
    status.className = 'text-red-500';
    status.textContent = 'error';
  }

  const meta = document.createElement('span');
  meta.className = 'ml-auto text-gray-500 dark:text-gray-400';
  meta.textContent = `${run.durationMs}ms · ${formatAge(run.at)}`;

  header.append(name, status, meta);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'hover:text-green-600 cursor-pointer';
  copyButton.title = 'Copy query to the clipboard';
  copyButton.textContent = 'Copy';

  const runButton = document.createElement('button');
  runButton.type = 'button';
  runButton.className = 'hover:text-green-600 cursor-pointer';
  runButton.title = 'Open in a new tab and execute';
  runButton.textContent = 'Run';

  if (run.query === '') {
    // NOTE: Nothing to copy or run when the template itself failed to render.
    copyButton.disabled = true;
    runButton.disabled = true;
    copyButton.className = 'text-gray-400 cursor-not-allowed';
    runButton.className = 'text-gray-400 cursor-not-allowed';
  }

  copyButton.addEventListener('click', (event) => {
    event.stopPropagation();
    navigator.clipboard
      .writeText(run.query)
      .then(() => {
        document.dispatchEvent(
          new CustomEvent('toast', {
            detail: { type: 'success', message: 'Query copied.', duration: 2000 },
          })
        );
      })
      .catch(() => {
        document.dispatchEvent(
          new CustomEvent('toast', {
            detail: { type: 'error', message: 'Could not copy query.', duration: 3000 },
          })
        );
      });
  });

  runButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!editorRef) return;
    openOrCreateTab(editorRef, 'completion query', run.query).then(() => {
      executeQuery();
    });
  });

  header.append(copyButton, runButton);
  item.appendChild(header);

  if (run.error !== undefined) {
    const error = document.createElement('div');
    error.className = 'px-2 pb-1.5 text-red-500 whitespace-pre-wrap break-words';
    error.textContent = run.error;
    item.appendChild(error);
  }

  if (run.query !== '') {
    const query = document.createElement('pre');
    query.className =
      'hidden px-2 pb-2 font-mono text-[11px] whitespace-pre-wrap break-words text-gray-600 dark:text-gray-300';
    query.textContent = run.query;
    item.appendChild(query);
    header.addEventListener('click', () => {
      query.classList.toggle('hidden');
    });
  }

  return item;
}

function buildSelector(editor: Editor) {
  const container = document.getElementById('templateSelector')!;
  container.innerHTML = '';

  TEMPLATE_GROUPS.forEach((group, groupIdx) => {
    if (groupIdx > 0) {
      const sep = document.createElement('div');
      sep.className = 'w-px bg-gray-300 dark:bg-gray-600 mx-0.5';
      container.appendChild(sep);
    }

    for (const { key, display } of group.keys) {
      const btn = document.createElement('button');
      btn.textContent = display;
      btn.dataset.templateKey = key;
      btn.className =
        'px-2 py-0.5 rounded cursor-pointer border border-button-border hover:bg-button-hover';
      btn.addEventListener('click', () => {
        selectTemplate(key, editor);
      });
      container.appendChild(btn);
    }
  });
}

function selectTemplate(key: QueryTemplate, editor: Editor) {
  if (!currentConfig || !templateEditor) return;

  // NOTE: Save current editor content back before switching.
  if (activeKey && currentConfig.queries[activeKey] !== undefined) {
    currentConfig.queries[activeKey]! = templateEditor.getValue();
  }

  activeKey = key;
  const value = currentConfig.queries[key] ?? '';
  templateEditor.setValue(value);

  // NOTE: Update selector button styles.
  const buttons = document.getElementById('templateSelector')!.querySelectorAll('button');
  for (const btn of buttons) {
    if ((btn as HTMLButtonElement).dataset.templateKey === key) {
      btn.className =
        'px-2 py-0.5 rounded cursor-pointer border border-green-600 bg-green-600 text-white';
    } else {
      btn.className =
        'px-2 py-0.5 rounded cursor-pointer border border-button-border hover:bg-button-hover';
    }
  }

  // NOTE: Re-register the change listener for instant apply.
  changeListener?.dispose();
  changeListener = templateEditor.onDidChangeModelContent(() => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => applyTemplate(editor), DEBOUNCE_MS);
  });
}

function applyTemplate(editor: Editor) {
  if (!currentConfig || !templateEditor || !activeKey) return;

  currentConfig.queries[activeKey] = templateEditor.getValue();

  editor.languageClient.sendNotification('qlueLs/addBackend', currentConfig).catch((err) => {
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: { type: 'error', message: `Failed to apply template: ${err}`, duration: 3000 },
      })
    );
  });
}

function saveTemplates() {
  if (!currentConfig || !templateEditor || !activeKey) return;

  // NOTE: Flush current editor content into the active template.
  currentConfig.queries[activeKey] = templateEditor.getValue();

  const apiKey = getApiKey();
  if (!apiKey) {
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          type: 'error',
          message: 'Missing API key!<br>Enter an API key to save templates.',
          duration: 3000,
        },
      })
    );
    return;
  }

  apiFetch(`endpoints/${currentConfig.name}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify({ queryTemplates: currentConfig.queries }),
  })
    .then((response) => {
      if (!response.ok) {
        let message = 'Templates could not be saved.';
        if (response.status === 403) {
          clearApiKey();
          message = 'Missing permissions!<br>Log into the API to save templates.';
        }
        document.dispatchEvent(
          new CustomEvent('toast', {
            detail: { type: 'error', message, duration: 3000 },
          })
        );
      } else {
        document.dispatchEvent(
          new CustomEvent('toast', {
            detail: { type: 'success', message: 'Templates saved.', duration: 3000 },
          })
        );
      }
    })
    .catch(() => {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: { type: 'error', message: 'Templates could not be saved.', duration: 3000 },
        })
      );
    });
}

function closeTemplatesEditor() {
  // NOTE: Stop listening for content changes.
  clearTimeout(debounceTimer);
  changeListener?.dispose();
  changeListener = null;

  // NOTE: Dispose the standalone editor.
  templateEditor?.dispose();
  templateEditor = null;
  activeKey = null;
  currentConfig = null;

  const panel = document.getElementById('templatePanel')!;
  panel.classList.add('hidden');
  panel.classList.remove('flex');

  // NOTE: Clear the editor container and the rendered run list (the history itself is kept).
  document.getElementById('templateEditorContainer')!.innerHTML = '';
  document.getElementById('templateRunsList')!.replaceChildren();

  // NOTE: Restore the container width (respects wide mode).
  toggleWideMode();

  // NOTE: Relayout Monaco after the panel closes.
  setTimeout(() => {
    window.__editor?.editorApp.getEditor()?.layout();
  }, 50);
}
