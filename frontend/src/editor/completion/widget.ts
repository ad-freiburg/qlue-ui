// ┌─────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import * as monaco from 'monaco-editor';
import { highlightMatches, parseKeywords } from '../../utils/fuzzy_filter';
import type { CompletionState, RenderItem } from './types';

const MAX_HEIGHT = '20rem';

const PANEL_CLASSES = [
  'flex',
  'flex-col',
  'rounded',
  'border',
  'border-neutral-300',
  'dark:border-neutral-700',
  'bg-white',
  'dark:bg-neutral-900',
  'text-neutral-900',
  'dark:text-neutral-100',
  'shadow-lg',
  'overflow-hidden',
  'text-sm',
];

const BAR_CLASSES = [
  'flex',
  'items-center',
  'justify-between',
  'gap-4',
  'px-3',
  'py-1.5',
  'text-xs',
  'text-neutral-500',
  'dark:text-neutral-400',
  'bg-neutral-100',
  'dark:bg-neutral-800',
];

const HIGHLIGHT_CLASSES = ['text-amber-600', 'dark:text-amber-400', 'font-semibold'];

/**
 * The completion popup.
 *
 * Rendered as a Monaco content widget so it inherits Monaco's anchoring and
 * above/below flipping. Monaco caches the widget's measured size and only
 * invalidates that cache on `layoutContentWidget`, so every render calls it.
 */
export class CompletionWidget implements monaco.editor.IContentWidget {
  // NOTE: render outside the editor's overflow:hidden view node, matching the
  // `fixedOverflowWidgets` setting used for the other widgets.
  readonly allowEditorOverflow = true;
  // NOTE: keeps a click on a row from stealing focus from the editor.
  readonly suppressMouseDown = true;

  private readonly domNode: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly header: HTMLElement;
  private readonly headerTerm: HTMLElement;
  private readonly body: HTMLElement;
  private readonly footer: HTMLElement;

  private position: monaco.IPosition | null = null;
  private visible = false;
  private rows: HTMLElement[] = [];

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly callbacks: {
      onAccept: (index: number) => void;
      onRetry: () => void;
      onOpenSettings: () => void;
    }
  ) {
    // NOTE: Monaco writes `display: block` inline on a content widget's dom
    // node, which would override a `flex` class on it. The layout therefore
    // lives on an inner panel that Monaco does not touch.
    this.domNode = document.createElement('div');
    this.domNode.dataset.testid = 'completion-widget';

    this.panel = document.createElement('div');
    this.panel.classList.add(...PANEL_CLASSES);
    this.panel.style.width = 'min(600px, calc(100vw - 32px))';
    this.panel.style.maxHeight = MAX_HEIGHT;

    this.header = document.createElement('div');
    this.header.classList.add(...BAR_CLASSES, 'border-b', 'border-neutral-200');
    this.header.classList.add('dark:border-neutral-700');
    const headerLabel = document.createElement('span');
    headerLabel.textContent = 'Suggestions';
    this.headerTerm = document.createElement('span');
    this.headerTerm.classList.add('truncate');
    this.header.append(headerLabel, this.headerTerm);

    this.body = document.createElement('div');
    // NOTE: `min-h-0` lets the list shrink inside the flex column, so a long
    // list scrolls instead of pushing the footer out of the panel.
    this.body.classList.add('overflow-y-auto', 'overflow-x-hidden', 'flex-1', 'min-h-0');
    this.body.setAttribute('role', 'listbox');

    this.footer = document.createElement('div');
    this.footer.classList.add(...BAR_CLASSES, 'border-t', 'border-neutral-200');
    this.footer.classList.add('dark:border-neutral-700');

    this.panel.append(this.header, this.body, this.footer);
    this.domNode.append(this.panel);
    editor.addContentWidget(this);
  }

  getId(): string {
    return 'qlue.completionWidget';
  }

  getDomNode(): HTMLElement {
    return this.domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    if (!this.visible || !this.position) return null;
    return {
      position: this.position,
      preference: [
        monaco.editor.ContentWidgetPositionPreference.BELOW,
        monaco.editor.ContentWidgetPositionPreference.ABOVE,
      ],
    };
  }

  isVisible(): boolean {
    return this.visible;
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.domNode.style.display = 'none';
    this.editor.layoutContentWidget(this);
  }

  /** Renders `state` at `position` and makes the widget visible. */
  show(state: CompletionState, position: monaco.IPosition, selected: number) {
    this.position = position;
    this.visible = true;
    this.domNode.style.display = '';
    this.render(state, selected);
  }

  /** Moves the highlight without rebuilding the list. */
  select(index: number) {
    this.rows.forEach((row, i) => {
      setRowSelected(row, i === index);
      if (i === index) row.scrollIntoView({ block: 'nearest' });
    });
    this.body.setAttribute('aria-activedescendant', `completion-item-${index}`);
  }

  private render(state: CompletionState, selected: number) {
    this.headerTerm.textContent = state.term ? `matching ${state.term}` : '';
    this.body.replaceChildren();
    this.rows = [];

    if (state.kind === 'items') {
      this.renderItems(state.items, state.term, selected);
      this.renderFooter([
        ['↑↓', 'navigate'],
        ['⏎', 'insert'],
        ['esc', 'dismiss'],
      ]);
    } else if (state.kind === 'empty') {
      this.renderMessage(
        'Nothing matches',
        state.term
          ? `No suggestion in this position matches ${state.term}.`
          : 'No suggestion is available in this position.'
      );
      this.renderFooter([['esc', 'dismiss']]);
    } else {
      const panel = this.renderMessage('Suggestions unavailable', state.message);
      const actions = document.createElement('div');
      actions.classList.add('flex', 'gap-3', 'mt-2');
      actions.append(
        linkButton('Try again', this.callbacks.onRetry),
        linkButton('Completion settings', this.callbacks.onOpenSettings)
      );
      panel.append(actions);
      this.renderFooter([['esc', 'dismiss']]);
    }

    this.editor.layoutContentWidget(this);
  }

  private renderItems(items: RenderItem[], term: string, selected: number) {
    const keywords = parseKeywords(term);
    items.forEach((renderItem, index) => {
      const row = document.createElement('div');
      row.id = `completion-item-${index}`;
      row.dataset.testid = 'completion-item';
      row.setAttribute('role', 'option');
      row.classList.add(
        'flex',
        'items-start',
        'justify-between',
        'gap-4',
        'px-3',
        'py-1',
        'cursor-pointer',
        'border-l-2',
        'border-transparent'
      );

      const text = document.createElement('div');
      text.classList.add('min-w-0');
      const primary = document.createElement('div');
      primary.classList.add('truncate');
      primary.innerHTML = highlightMatches(renderItem.primary, keywords, HIGHLIGHT_CLASSES);
      text.append(primary);
      if (renderItem.secondary) {
        const secondary = document.createElement('div');
        secondary.classList.add(
          'truncate',
          'text-xs',
          'text-sky-700',
          'dark:text-sky-400',
          'font-mono'
        );
        secondary.textContent = renderItem.secondary;
        text.append(secondary);
      }
      row.append(text);

      if (renderItem.score !== null) {
        const score = document.createElement('div');
        score.classList.add(
          'shrink-0',
          'text-xs',
          'tabular-nums',
          'text-neutral-500',
          'dark:text-neutral-400'
        );
        score.textContent = renderItem.score.toLocaleString();
        row.append(score);
      }

      setRowSelected(row, index === selected);
      row.addEventListener('click', () => this.callbacks.onAccept(index));
      this.body.append(row);
      this.rows.push(row);
    });
    this.body.setAttribute('aria-activedescendant', `completion-item-${selected}`);
    this.rows[selected]?.scrollIntoView({ block: 'nearest' });
  }

  private renderMessage(title: string, message: string): HTMLElement {
    const panel = document.createElement('div');
    panel.classList.add('px-3', 'py-3');
    const heading = document.createElement('div');
    heading.classList.add('font-semibold');
    heading.textContent = title;
    const body = document.createElement('div');
    body.classList.add('text-xs', 'text-neutral-500', 'dark:text-neutral-400', 'mt-1');
    body.textContent = message;
    panel.append(heading, body);
    this.body.append(panel);
    return panel;
  }

  private renderFooter(hints: [string, string][]) {
    this.footer.replaceChildren();
    const left = document.createElement('div');
    left.classList.add('flex', 'gap-3');
    for (const [key, label] of hints) {
      const hint = document.createElement('span');
      hint.classList.add('flex', 'items-center', 'gap-1');
      const kbd = document.createElement('kbd');
      kbd.classList.add(
        'px-1',
        'rounded',
        'bg-neutral-200',
        'dark:bg-neutral-700',
        'font-mono',
        'not-italic'
      );
      kbd.textContent = key;
      const text = document.createElement('span');
      text.textContent = label;
      hint.append(kbd, text);
      left.append(hint);
    }
    this.footer.append(left);
  }

  dispose() {
    this.editor.removeContentWidget(this);
  }
}

function setRowSelected(row: HTMLElement, selected: boolean) {
  row.classList.toggle('bg-neutral-100', selected);
  row.classList.toggle('dark:bg-neutral-800', selected);
  row.classList.toggle('border-sky-500', selected);
  row.classList.toggle('border-transparent', !selected);
  row.setAttribute('aria-selected', String(selected));
}

function linkButton(label: string, onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add(
    'text-xs',
    'text-sky-700',
    'dark:text-sky-400',
    'hover:underline',
    'cursor-pointer'
  );
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}
