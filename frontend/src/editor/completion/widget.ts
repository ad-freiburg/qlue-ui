// ┌─────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import * as monaco from 'monaco-editor';
import { escapeRegExp, highlightMatches, parseKeywords } from '../../utils/fuzzy_filter';
import type { CompletionState, RenderContent, RenderItem } from './types';

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

/** Mono classes shared by the curie line and by every literal value. */
const MONO_CLASSES = ['truncate', 'text-xs', 'font-mono'];

const MUTED_CLASSES = ['text-neutral-500', 'dark:text-neutral-400'];

// NOTE: the editor's own syntax colours for the three literal shapes, so a
// suggestion reads the way it will read once inserted.
const VALUE_CLASSES: Record<Extract<RenderContent, { kind: 'literal' }>['valueKind'], string[]> = {
  text: ['text-orange-700', 'dark:text-orange-300'],
  number: ['text-emerald-700', 'dark:text-emerald-300'],
  date: ['text-yellow-700', 'dark:text-yellow-200'],
};

const SPINNER_CLASSES = [
  'size-3',
  'shrink-0',
  'rounded-full',
  'border',
  'border-neutral-400',
  'dark:border-neutral-500',
  'border-t-transparent',
  'dark:border-t-transparent',
  'animate-spin',
];

function createSpinner(...extra: string[]): HTMLElement {
  const spinner = document.createElement('span');
  spinner.setAttribute('role', 'status');
  spinner.setAttribute('aria-label', 'Loading suggestions');
  spinner.classList.add(...SPINNER_CLASSES, ...extra);
  return spinner;
}

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
  private readonly spinner: HTMLElement;
  private readonly body: HTMLElement;
  private readonly footer: HTMLElement;
  private readonly staleNote: HTMLElement;

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
    const status = document.createElement('span');
    status.classList.add('flex', 'items-center', 'gap-2', 'min-w-0');
    this.spinner = createSpinner();
    this.spinner.dataset.testid = 'completion-spinner';
    this.spinner.hidden = true;
    this.headerTerm = document.createElement('span');
    this.headerTerm.classList.add('truncate');
    status.append(this.spinner, this.headerTerm);
    this.header.append(headerLabel, status);

    this.body = document.createElement('div');
    // NOTE: `min-h-0` lets the list shrink inside the flex column, so a long
    // list scrolls instead of pushing the footer out of the panel.
    this.body.classList.add('overflow-y-auto', 'overflow-x-hidden', 'flex-1', 'min-h-0');
    this.body.setAttribute('role', 'listbox');

    this.footer = document.createElement('div');
    this.footer.classList.add(...BAR_CLASSES, 'border-t', 'border-neutral-200');
    this.footer.classList.add('dark:border-neutral-700');
    // NOTE: lives in the footer for the widget's lifetime rather than being
    // rebuilt per render, because it is toggled between renders — a keystroke
    // re-requests without re-rendering the list.
    this.staleNote = document.createElement('span');
    this.staleNote.dataset.testid = 'completion-stale';
    this.staleNote.classList.add('ml-auto', 'truncate', 'min-w-0');
    this.staleNote.hidden = true;

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

  /** Shows or hides the spinner that marks a request in flight. */
  setPending(pending: boolean) {
    if (this.spinner.hidden === !pending) return;
    this.spinner.hidden = !pending;
    // NOTE: Monaco caches the widget's measured size until it is told the
    // widget changed, and the spinner is the only thing that changes outside a
    // render.
    this.editor.layoutContentWidget(this);
  }

  /**
   * Marks the list as belonging to an older term than the one being typed.
   *
   * The rows stay in place and stay selectable — a list the user is already
   * reading must not be blanked — but they dim while the answer for the live
   * term is on its way, and the footer says which term they are answering.
   */
  setStale(term: string | null) {
    const stale = term !== null;
    if (stale) {
      this.staleNote.replaceChildren('showing results for ', termElement(term));
    }
    if (this.staleNote.hidden === !stale) return;
    this.staleNote.hidden = !stale;
    // NOTE: opacity alone, so the rows keep their colours and stay readable;
    // the pulse is what says the list is still moving.
    this.body.classList.toggle('opacity-50', stale);
    this.body.classList.toggle('animate-pulse', stale);
    this.editor.layoutContentWidget(this);
  }

  /**
   * Updates the term in the header without rebuilding the list.
   *
   * NOTE: an entity list is re-requested on every keystroke and only re-renders
   * once the answer lands, so the header would otherwise name the term the last
   * response was for rather than the one on screen.
   */
  setTerm(term: string) {
    if (!this.applyTerm(term)) return;
    this.editor.layoutContentWidget(this);
  }

  /** Writes the header term, reporting whether it changed. */
  private applyTerm(term: string): boolean {
    if (this.headerTerm.dataset.term === term) return false;
    this.headerTerm.dataset.term = term;
    this.headerTerm.replaceChildren();
    if (!term) return true;
    this.headerTerm.append('matching ', termElement(term));
    return true;
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.domNode.style.display = 'none';
    // NOTE: a hidden row is still in the DOM, and a dismissed list must not
    // leave one behind for anything that counts rows rather than looks at them.
    this.body.replaceChildren();
    this.rows = [];
    this.spinner.hidden = true;
    this.setStale(null);
    this.applyTerm('');
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
    this.applyTerm(state.term);
    this.body.replaceChildren();
    this.rows = [];

    if (state.kind === 'items') {
      this.renderItems(state.items, state.term, selected);
      this.renderFooter([
        ['↑↓', 'navigate'],
        ['⏎', 'insert'],
        ['esc', 'dismiss'],
      ]);
    } else if (state.kind === 'pending') {
      this.renderMessage(
        'Searching…',
        state.term ? `Looking for suggestions matching ${state.term}.` : 'Looking for suggestions.',
        createSpinner('mt-1')
      );
      this.renderFooter([['esc', 'dismiss']]);
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
    // NOTE: the term is source text, not a search query — `?la` would otherwise
    // be a broken regex and get dropped, leaving nothing highlighted.
    const keywords = parseKeywords(escapeRegExp(term));
    items.forEach((renderItem, index) => {
      const content = renderItem.content;
      const row = document.createElement('div');
      row.id = `completion-item-${index}`;
      row.dataset.testid = 'completion-item';
      row.setAttribute('role', 'option');
      row.classList.add(
        'flex',
        // NOTE: a literal is a single line, so its value, its tag and its count
        // sit on one baseline; the two-line rows align to the top instead.
        content.kind === 'literal' ? 'items-baseline' : 'items-start',
        'justify-between',
        'gap-4',
        'px-3',
        'py-1',
        'cursor-pointer',
        'border-l-2',
        'border-transparent'
      );

      const text = document.createElement('div');
      text.classList.add('min-w-0', 'flex-1');
      if (content.kind === 'literal') {
        renderLiteral(text, content, keywords);
      } else if (content.kind === 'entity') {
        renderEntity(text, content, term, keywords);
      } else {
        renderPlain(text, content, keywords);
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

  private renderMessage(title: string, message: string, icon?: HTMLElement): HTMLElement {
    const panel = document.createElement('div');
    panel.classList.add('px-3', 'py-3');
    const heading = document.createElement('div');
    heading.classList.add('font-semibold');
    heading.textContent = title;
    const body = document.createElement('div');
    body.classList.add('text-xs', 'text-neutral-500', 'dark:text-neutral-400', 'mt-1');
    body.textContent = message;
    if (icon) {
      // NOTE: the icon sits beside the text as a whole, so the heading and the
      // body go in a column of their own rather than side by side with it.
      const text = document.createElement('div');
      text.classList.add('min-w-0');
      text.append(heading, body);
      const row = document.createElement('div');
      row.classList.add('flex', 'items-start', 'gap-2');
      row.append(icon, text);
      panel.append(row);
    } else {
      panel.append(heading, body);
    }
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
    this.footer.append(left, this.staleNote);
  }

  dispose() {
    this.editor.removeContentWidget(this);
  }
}

/**
 * A literal on one line: the value in the editor's colour for its type, the
 * language tag or datatype trailing it, nothing underneath.
 */
function renderLiteral(
  text: HTMLElement,
  content: Extract<RenderContent, { kind: 'literal' }>,
  keywords: RegExp[]
) {
  const line = document.createElement('div');
  line.classList.add('flex', 'items-baseline', 'gap-1.5', 'min-w-0');
  const value = document.createElement('span');
  value.classList.add(...MONO_CLASSES, ...VALUE_CLASSES[content.valueKind]);
  value.innerHTML = highlightMatches(content.value, keywords, HIGHLIGHT_CLASSES);
  line.append(value);
  if (content.suffix) {
    const suffix = document.createElement('span');
    suffix.classList.add('text-xs', 'font-mono', 'shrink-0', ...MUTED_CLASSES);
    suffix.textContent = content.suffix;
    line.append(suffix);
  }
  text.append(line);
}

/**
 * An entity on two lines: its name, and its curie underneath.
 *
 * The curie line also answers why the row is here at all. When the term
 * matched an alias rather than the name, that one alias follows the curie in a
 * chip and the rest collapse into a count — so a row never grows a line, and
 * eight aliases read the same as one. When the name itself matched there is no
 * chip, which makes the chip's presence the signal.
 */
function renderEntity(
  text: HTMLElement,
  content: Extract<RenderContent, { kind: 'entity' }>,
  term: string,
  keywords: RegExp[]
) {
  const name = document.createElement('div');
  name.classList.add('truncate');
  name.innerHTML = highlightMatches(content.name, keywords, HIGHLIGHT_CLASSES);
  text.append(name);

  const line = document.createElement('div');
  line.classList.add('flex', 'items-baseline', 'gap-1.5', 'min-w-0', 'text-xs');
  const curie = document.createElement('span');
  curie.classList.add(...MONO_CLASSES, 'text-teal-700', 'dark:text-teal-300', 'shrink-0');
  curie.textContent = content.curie;
  line.append(curie);

  const matched = matchedAlias(content, term);
  if (matched) {
    const via = document.createElement('span');
    via.classList.add('shrink-0', ...MUTED_CLASSES);
    via.textContent = 'via';
    const chip = document.createElement('span');
    chip.classList.add(
      'shrink-0',
      'px-1.5',
      'rounded',
      'font-mono',
      'bg-amber-100',
      'dark:bg-amber-400/15',
      'text-neutral-800',
      'dark:text-neutral-100'
    );
    chip.innerHTML = highlightMatches(matched, keywords, HIGHLIGHT_CLASSES);
    line.append(via, chip);
  }
  const hidden = content.aliases.length - (matched ? 1 : 0);
  if (hidden > 0) {
    const rest = document.createElement('span');
    rest.classList.add('shrink-0', ...MUTED_CLASSES);
    rest.textContent = `+${hidden} ${hidden === 1 ? 'alias' : 'aliases'}`;
    line.append(rest);
  }
  text.append(line);
}

/** A keyword, a snippet or a built-in call: the name, then its signature. */
function renderPlain(
  text: HTMLElement,
  content: Extract<RenderContent, { kind: 'plain' }>,
  keywords: RegExp[]
) {
  const label = document.createElement('div');
  label.classList.add('truncate');
  label.innerHTML = highlightMatches(content.label, keywords, HIGHLIGHT_CLASSES);
  text.append(label);
  if (content.detail) {
    const detail = document.createElement('div');
    detail.classList.add('truncate', 'text-xs', 'font-mono', 'text-sky-700', 'dark:text-sky-400');
    detail.textContent = content.detail;
    text.append(detail);
  }
}

/**
 * The alias the term matched, or `null` when the name itself matched.
 *
 * Prefix matching, case-insensitive — the same rule the completion queries
 * filter on, so this picks the alias the backend answered with.
 */
function matchedAlias(
  content: Extract<RenderContent, { kind: 'entity' }>,
  term: string
): string | null {
  if (!term || content.name.toLowerCase().startsWith(term.toLowerCase())) return null;
  return (
    content.aliases.find((alias) => alias.toLowerCase().startsWith(term.toLowerCase())) ?? null
  );
}

/**
 * A search term, in the amber the rows highlight it in — so the header and the
 * footer name the same thing the rows are marking.
 */
function termElement(term: string): HTMLElement {
  const value = document.createElement('span');
  value.classList.add('font-mono', 'text-amber-600', 'dark:text-amber-400');
  value.textContent = term;
  return value;
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
