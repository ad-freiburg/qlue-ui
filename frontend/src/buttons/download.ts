import type { Editor } from '../editor/init';
import { getShareLinkId } from '../share/init';
import {
  type IdentifyOperationTypeResult,
  SparqlEngine,
  type SparqlService,
} from '../types/lsp_messages';

interface DownloadFormat {
  label: string;
  extension: string;
  // NOTE: QLever export action, passed as the `action` query parameter.
  action: string;
}

const FORMATS: DownloadFormat[] = [
  { label: 'TSV', extension: 'tsv', action: 'tsv_export' },
  { label: 'CSV', extension: 'csv', action: 'csv_export' },
  { label: 'JSON', extension: 'json', action: 'sparql_json_export' },
];

export function setupDownload(editor: Editor) {
  const downloadButton = document.getElementById('downloadButton')!;

  downloadButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFormatMenu(editor, downloadButton);
  });
}

function toast(type: 'info' | 'warning' | 'error' | 'success', message: string) {
  document.dispatchEvent(new CustomEvent('toast', { detail: { type, message, duration: 2000 } }));
}

async function downloadResults(editor: Editor, format: DownloadFormat) {
  // NOTE: Check for empty query.
  const query = editor.getContent();
  if (query.trim() === '') {
    toast('warning', 'There is no query to execute :(');
    return;
  }

  // NOTE: Check operation type.
  const response = (await editor.languageClient.sendRequest('qlueLs/identifyOperationType', {
    textDocument: {
      uri: editor.getDocumentUri(),
    },
  })) as IdentifyOperationTypeResult;
  if (response.operationType !== 'Query') {
    toast('warning', 'This is not a query.<br>There is nothing to download.');
    return;
  }

  const sparqlService = await editor.languageClient
    .sendRequest('qlueLs/getBackend', {})
    .then((response) => {
      const typedResponse = response as SparqlService | { error: string };
      if ('error' in typedResponse) {
        throw new Error(`Could not determine sparqlService`);
      }
      return typedResponse;
    });

  // NOTE: Fetch and download data if the engine is QLever.
  if (sparqlService.engine === SparqlEngine.QLever) {
    const dataUrl = `${sparqlService.url}?query=${encodeURIComponent(query)}&action=${format.action}`;
    const a = document.createElement('a');
    a.href = dataUrl;
    const shareId = await getShareLinkId(query).catch(() => 'query');
    a.setAttribute('download', `${sparqlService.name}-${shareId}.${format.extension}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    toast('error', 'Download is currently only supported<br>for QLever-SPARQL-endpoints');
  }
}

// NOTE: Format-picker dropdown anchored to the download button.
let openMenu: HTMLElement | null = null;
let openMenuAnchor: HTMLElement | null = null;

function toggleFormatMenu(editor: Editor, anchor: HTMLElement) {
  if (openMenu) {
    closeFormatMenu();
    return;
  }
  openFormatMenu(editor, anchor);
}

function openFormatMenu(editor: Editor, anchor: HTMLElement) {
  const menu = document.createElement('div');
  menu.className =
    'fixed z-50 min-w-[8rem] py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg text-sm text-gray-700 dark:text-gray-200';

  for (const format of FORMATS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700';

    const label = document.createElement('span');
    label.textContent = format.label;
    const ext = document.createElement('span');
    ext.className = 'text-gray-400 dark:text-gray-500';
    ext.textContent = `.${format.extension}`;
    btn.append(label, ext);

    btn.addEventListener('click', () => {
      closeFormatMenu();
      downloadResults(editor, format);
    });
    menu.appendChild(btn);
  }

  document.body.appendChild(menu);
  openMenu = menu;
  openMenuAnchor = anchor;
  anchor.setAttribute('aria-expanded', 'true');

  // NOTE: Drop the menu below the caret, right-aligned; flip above if it would overflow.
  const rect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(4, rect.right - menuRect.width)}px`;
  menu.style.top =
    rect.bottom + 4 + menuRect.height > window.innerHeight
      ? `${rect.top - menuRect.height - 4}px`
      : `${rect.bottom + 4}px`;

  // Defer dismissal listeners so the triggering click doesn't immediately close us.
  setTimeout(() => {
    document.addEventListener('mousedown', onDocumentMouseDown, true);
    document.addEventListener('keydown', onDocumentKeyDown, true);
    window.addEventListener('blur', closeFormatMenu);
    window.addEventListener('resize', closeFormatMenu);
  });
}

function closeFormatMenu() {
  if (!openMenu) return;
  openMenu.remove();
  openMenu = null;
  openMenuAnchor?.setAttribute('aria-expanded', 'false');
  openMenuAnchor = null;
  document.removeEventListener('mousedown', onDocumentMouseDown, true);
  document.removeEventListener('keydown', onDocumentKeyDown, true);
  window.removeEventListener('blur', closeFormatMenu);
  window.removeEventListener('resize', closeFormatMenu);
}

function onDocumentMouseDown(e: MouseEvent): void {
  const target = e.target as Node;
  // NOTE: Let the button's own click handler toggle the menu closed.
  if (openMenuAnchor?.contains(target)) return;
  if (openMenu && !openMenu.contains(target)) closeFormatMenu();
}

function onDocumentKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeFormatMenu();
}
