// NOTE: Template editor panel lifecycle — open/close, selector, and LS communication.

import * as monaco from 'monaco-editor';
import type { Editor } from '../editor/init';
import type { QlueLsServiceConfig } from '../types/backend';

const WIDE_CLASSES = ['w-full', 'xl:w-full'];
const ORIGINAL_WIDTH_CLASS = 'xl:w-[72rem]';
const DEBOUNCE_MS = 300;

const TEMPLATE_GROUPS: { label: string; keys: { key: string; display: string }[] }[] = [
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

let templateEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let activeKey: string | null = null;
let currentConfig: QlueLsServiceConfig | null = null;
let debounceTimer: number | undefined;
let changeListener: monaco.IDisposable | null = null;

/** Registers the close button and backend-switch listener for the templates editor. */
export function setupTemplatesEditor(editor: Editor) {
  document.getElementById('templatePanelClose')!.addEventListener('click', () => {
    closeTemplatesEditor();
    editor.focus();
  });

  document.addEventListener('backend-selected', () => {
    if (templateEditor) {
      closeTemplatesEditor();
    }
  });
}

/** Opens the templates editor panel, fetches current backend config, and creates the editor. */
export async function openTemplatesEditor(editor: Editor) {
  if (templateEditor) return;

  const panel = document.getElementById('templatePanel')!;

  // NOTE: Fetch current backend config from the language server.
  // sendRequest returns the result directly; errors are thrown as exceptions.
  let config: QlueLsServiceConfig;
  try {
    config = (await editor.languageClient.sendRequest('qlueLs/getBackend', {})) as QlueLsServiceConfig;
  } catch (err) {
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: { type: 'error', message: `Failed to fetch backend config: ${err}`, duration: 3000 },
      })
    );
    return;
  }

  currentConfig = config;

  // NOTE: Widen the parent container to make room for the template panel.
  const container = document.getElementById('mainContainer')!;
  container.classList.remove(ORIGINAL_WIDTH_CLASS);
  container.classList.add(...WIDE_CLASSES);

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

  buildSelector();
  selectTemplate(TEMPLATE_GROUPS[0].keys[0].key, editor);
}

function buildSelector() {
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
        'px-2 py-0.5 rounded cursor-pointer border border-gray-300 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600';
      btn.addEventListener('click', () => {
        selectTemplate(key, (window as any).__editor);
      });
      container.appendChild(btn);
    }
  });
}

function selectTemplate(key: string, editor: Editor) {
  if (!currentConfig || !templateEditor) return;

  // NOTE: Save current editor content back before switching.
  if (activeKey && currentConfig.queries[activeKey] !== undefined) {
    currentConfig.queries[activeKey] = templateEditor.getValue();
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
        'px-2 py-0.5 rounded cursor-pointer border border-gray-300 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600';
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

  // NOTE: Clear the editor container.
  document.getElementById('templateEditorContainer')!.innerHTML = '';

  // NOTE: Restore the original container width.
  const container = document.getElementById('mainContainer')!;
  container.classList.remove(...WIDE_CLASSES);
  container.classList.add(ORIGINAL_WIDTH_CLASS);

  // NOTE: Relayout Monaco after the panel closes.
  setTimeout(() => {
    (window as any).__editor?.editorApp.getEditor()?.layout();
  }, 50);
}
