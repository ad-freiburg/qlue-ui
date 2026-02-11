// NOTE: Parse tree panel lifecycle — open/close, layout toggling, and listener management.

import type { IDisposable } from 'monaco-editor';
import type { Editor } from '../editor/init';
import type { ParseTreeResult } from '../types/parse_tree';
import { clearHighlights, highlightRowsAtCursor, initDecorations } from './highlight';
import { renderElement } from './render';

const WIDE_CLASSES = ['w-full', 'xl:w-full'];
const ORIGINAL_WIDTH_CLASS = 'xl:w-[72rem]';
const DEBOUNCE_MS = 300;

let changeListener: IDisposable | null = null;
let cursorListener: IDisposable | null = null;
let debounceTimer: number | undefined;

export function setupParseTree(editor: Editor) {
  document.getElementById('parseTreeClose')!.addEventListener('click', () => {
    closeParseTree();
    editor.focus();
  });
}

export async function openParseTree(editor: Editor) {
  const panel = document.getElementById('parseTreePanel')!;

  // NOTE: Widen the parent container to make room for the tree panel.
  const container = document.getElementById('mainContainer')!;
  container.classList.remove(ORIGINAL_WIDTH_CLASS);
  container.classList.add(...WIDE_CLASSES);

  panel.classList.remove('hidden');
  panel.classList.add('flex');

  // NOTE: Let the layout settle, then relayout Monaco.
  setTimeout(() => editor.editorApp.getEditor()?.layout(), 50);

  await refreshParseTree(editor);

  const monacoEditor = editor.editorApp.getEditor()!;

  // NOTE: Listen for content changes and refresh the tree with debounce.
  changeListener?.dispose();
  changeListener = monacoEditor.onDidChangeModelContent(() => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => refreshParseTree(editor), DEBOUNCE_MS);
  });

  // NOTE: Listen for cursor position changes and highlight containing rows.
  cursorListener?.dispose();
  cursorListener = monacoEditor.onDidChangeCursorPosition((e) => {
    highlightRowsAtCursor(e.position);
  });
  highlightRowsAtCursor(monacoEditor.getPosition()!);
}

async function refreshParseTree(editor: Editor) {
  const content = document.getElementById('parseTreeContent')!;
  const headerLabel = document.getElementById('parseTreePanel')!.querySelector('span')!;

  content.textContent = 'Loading...';
  headerLabel.textContent = 'Parse Tree';

  try {
    const result = (await editor.languageClient.sendRequest('qlueLs/parseTree', {
      textDocument: { uri: editor.getDocumentUri() },
      skipTrivia: true,
    })) as ParseTreeResult;

    headerLabel.textContent = `Parse Tree (${result.timeMs.toFixed(1)} ms)`;
    content.innerHTML = '';
    initDecorations(editor.editorApp.getEditor()!);
    content.appendChild(renderElement(result.tree));
    const pos = editor.editorApp.getEditor()!.getPosition();
    if (pos) highlightRowsAtCursor(pos);
  } catch (err) {
    content.textContent = `Error: ${err}`;
  }
}

function closeParseTree() {
  // NOTE: Stop listening for content changes.
  clearTimeout(debounceTimer);
  changeListener?.dispose();
  changeListener = null;
  cursorListener?.dispose();
  cursorListener = null;
  clearHighlights();

  const panel = document.getElementById('parseTreePanel')!;
  panel.classList.add('hidden');
  panel.classList.remove('flex');

  // NOTE: Restore the original container width.
  const container = document.getElementById('mainContainer')!;
  container.classList.remove(...WIDE_CLASSES);
  container.classList.add(ORIGINAL_WIDTH_CLASS);

  // NOTE: Relayout Monaco after the panel closes.
  setTimeout(() => {
    (window as any).__editor?.editorApp.getEditor()?.layout();
  }, 50);
}
