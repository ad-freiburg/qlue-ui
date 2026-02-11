// NOTE: Recursive DOM rendering for parse tree elements.
// Nodes render as collapsible branches, tokens as leaves.

import type { ParseTreeElement } from '../types/parse_tree';
import { attachHoverHighlight, registerRow } from './highlight';

export function renderElement(element: ParseTreeElement): HTMLElement {
  if (element.type === 'token') {
    return renderToken(element);
  }
  return renderNode(element);
}

function renderNode(node: ParseTreeElement & { type: 'node' }): HTMLElement {
  const wrapper = document.createElement('div');

  const row = document.createElement('div');
  row.className =
    'flex items-center gap-1 py-px hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded px-1 cursor-default';

  const toggle = document.createElement('span');
  toggle.className = 'w-4 text-center text-[10px] cursor-pointer select-none text-neutral-400';
  toggle.textContent = '▼';

  const kind = document.createElement('span');
  kind.className = 'text-blue-600 dark:text-blue-400';
  kind.textContent = node.kind;

  row.appendChild(toggle);
  row.appendChild(kind);
  attachHoverHighlight(row, node.range);
  registerRow(row, node.range);

  const children = document.createElement('div');
  children.className = 'pl-4';
  for (const child of node.children) {
    children.appendChild(renderElement(child));
  }

  row.addEventListener('click', () => {
    children.classList.toggle('hidden');
    toggle.textContent = children.classList.contains('hidden') ? '▶' : '▼';
  });

  wrapper.appendChild(row);
  wrapper.appendChild(children);
  return wrapper;
}

function renderToken(token: ParseTreeElement & { type: 'token' }): HTMLElement {
  const row = document.createElement('div');
  row.className =
    'flex items-center gap-1 py-px hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded px-1 cursor-default';

  const spacer = document.createElement('span');
  spacer.className = 'w-4';

  const kind = document.createElement('span');
  kind.className = 'text-emerald-600 dark:text-emerald-400';
  kind.textContent = token.kind;

  const text = document.createElement('span');
  text.className = 'text-neutral-500 dark:text-neutral-400 truncate';
  text.textContent = `"${token.text}"`;

  row.appendChild(spacer);
  row.appendChild(kind);
  row.appendChild(text);
  attachHoverHighlight(row, token.range);
  registerRow(row, token.range);
  return row;
}
