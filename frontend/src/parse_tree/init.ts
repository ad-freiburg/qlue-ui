// NOTE: Parse tree panel lifecycle — open/close, layout toggling, and listener management.

import type { IDisposable } from 'monaco-editor';
import type { Editor } from '../editor/init';
import type { ParseTreeResult } from '../types/parse_tree';
import { applyPanelWidth, toggleWideMode } from '../buttons/wide_mode';
import { clearHighlights, highlightRowsAtCursor, initDecorations } from './highlight';
import { renderElement } from './render';

const DEBOUNCE_MS = 50;

let changeListener: IDisposable | null = null;
let cursorListener: IDisposable | null = null;
let debounceTimer: number | undefined;

/** Registers the close button and show trivia toggle for the parse tree panel. */
export function setupParseTree(editor: Editor) {
  document.getElementById('parseTreeClose')!.addEventListener('click', () => {
    closeParseTree();
    editor.focus();
  });

  // NOTE: Refresh the tree when the show trivia toggle changes.
  document.getElementById('parseTreeShowTrivia')!.addEventListener('change', () => {
    if (!isPanelOpen()) return;
    refreshParseTree(editor);
  });

  // NOTE: Show or hide Syntax element spans.
  const parseTreeShowSpanToggle = document.getElementById('parseTreeShowSpan') as HTMLInputElement;
  parseTreeShowSpanToggle.addEventListener('change', () => {
    if (!isPanelOpen()) return;
    document.querySelectorAll('.parse-tree-sytax-range').forEach((el) => {
      el.classList.toggle('hidden', !parseTreeShowSpanToggle.checked);
    });
  });
}

/** Returns true if the parse tree panel is currently visible. */
function isPanelOpen(): boolean {
  return !document.getElementById('parseTreePanel')!.classList.contains('hidden');
}

/**
 * Opens the parse tree side panel, widens the main container to accommodate
 * it, and starts listening for editor content and cursor changes to keep the
 * tree in sync.
 */
export async function openParseTree(editor: Editor) {
  const panel = document.getElementById('parseTreePanel')!;

  // NOTE: Widen the parent container to make room for the tree panel.
  applyPanelWidth();

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

  // NOTE: Set URL search paramerter for persitency.
  const url = new URL(window.location.href);
  url.searchParams.set('parseTree', 'true');
  window.history.replaceState({}, '', url);

  // NOTE: Show or hide Syntax element spans.
  const parseTreeShowSpanToggle = document.getElementById('parseTreeShowSpan') as HTMLInputElement;
  document.querySelectorAll('.parse-tree-sytax-range').forEach((el) => {
    el.classList.toggle('hidden', !parseTreeShowSpanToggle.checked);
  });
}

async function refreshParseTree(editor: Editor) {
  const content = document.getElementById('parseTreeContent')!;
  const headerLabel = document.getElementById('parseTreePanel')!.querySelector('span')!;
  const showTriviaCheckbox = document.getElementById('parseTreeShowTrivia') as HTMLInputElement;
  const parseTreeShowSpanToggle = document.getElementById('parseTreeShowSpan') as HTMLInputElement;

  try {
    const result = (await editor.languageClient.sendRequest('qlueLs/parseTree', {
      textDocument: { uri: editor.getDocumentUri() },
      skipTrivia: !showTriviaCheckbox.checked,
    })) as ParseTreeResult;

    // NOTE: Build the new tree off-DOM in a fragment, then swap in one operation.
    const fragment = document.createDocumentFragment();
    initDecorations(editor.editorApp.getEditor()!);

    fragment.appendChild(renderElement(result.tree, parseTreeShowSpanToggle.checked));

    content.innerHTML = '';
    content.appendChild(fragment);

    headerLabel.textContent = `Parse Tree (${result.timeMs.toFixed(1)} ms)`;
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

  // NOTE: Restore the container width (respects wide mode).
  toggleWideMode();

  // NOTE: Relayout Monaco after the panel closes.
  setTimeout(() => {
    (window as any).__editor?.editorApp.getEditor()?.layout();
  }, 50);

  // NOTE: Remove URL search paramerter.
  const url = new URL(window.location.href);
  url.searchParams.delete('parseTree');
  window.history.replaceState({}, '', url);
}
