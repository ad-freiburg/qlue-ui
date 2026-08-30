// ┌─────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import * as monaco from 'monaco-editor';
import { openSettings } from '../../settings/utils';
import type { Range } from '../../types/lsp_messages';
import { escapeRegExp, matchesAllKeywords, parseKeywords } from '../../utils/fuzzy_filter';
import type { Editor } from '../init';
import { toMonacoRange } from '../utils';
import { Trace, trace } from './trace';
import {
  type CompletionItem,
  type CompletionList,
  type CompletionState,
  type RenderItem,
  SNIPPET_FORMAT,
  VALUE_KIND,
} from './types';
import { CompletionWidget } from './widget';

/** JSON-RPC error code for a request the client itself cancelled. */
const REQUEST_CANCELLED = -32800;
const DEBOUNCE_MS = 100;

/** LSP `CompletionTriggerKind`. */
enum TriggerKind {
  Invoked = 1,
  TriggerCharacter = 2,
}

interface Session {
  /** The word the current list was requested for. */
  term: string;
  /** All items the server returned, in server order. */
  items: RenderItem[];
  /** Whether the server wants a fresh request on every keystroke. */
  isIncomplete: boolean;
  /** Where the popup is anchored. */
  anchor: monaco.IPosition;
  /**
   * Where the term being completed starts, when the server said so.
   *
   * NOTE: distinct from `anchor`, which falls back to the cursor at request
   * time so the popup always has somewhere to sit. That fallback is not a term
   * start — it sits *after* whatever was already typed — so it must not be
   * used for filtering or highlighting.
   */
  termStart: monaco.IPosition | undefined;
}

export class CompletionController {
  private readonly monacoEditor: monaco.editor.IStandaloneCodeEditor;
  private readonly widget: CompletionWidget;

  private triggerCharacters: string[] = [];
  private debounceHandle: number | undefined;
  private tokenSource: { cancel(): void; dispose(): void; token: unknown } | undefined;
  private requestVersion = 0;
  private session: Session | undefined;
  private state: CompletionState | undefined;
  private selected = 0;

  constructor(private readonly editor: Editor) {
    this.monacoEditor = editor.editorApp.getEditor()!;
    this.widget = new CompletionWidget(this.monacoEditor, {
      onAccept: (index) => this.accept(index),
      onRetry: () => this.trigger(TriggerKind.Invoked),
      onOpenSettings: () => {
        this.hide();
        openSettings();
      },
    });

    this.triggerCharacters =
      (this.editor.languageClient.initializeResult?.capabilities?.completionProvider
        ?.triggerCharacters as string[] | undefined) ?? [];

    this.monacoEditor.onDidChangeModelContent((event) => this.onContentChanged(event));
    this.monacoEditor.onDidChangeCursorPosition((event) => {
      // NOTE: typing moves the cursor too (reason NotSet); only an explicit
      // move — arrow keys outside the widget, a click — dismisses.
      if (!this.widget.isVisible()) return;
      if (event.reason === monaco.editor.CursorChangeReason.Explicit) this.hide();
    });
    this.monacoEditor.onDidBlurEditorWidget(() => this.hide());
    this.monacoEditor.onKeyDown((event) => this.onKeyDown(event));
  }

  /** Hides the widget and cancels any request in flight. */
  hide() {
    if (this.widget.isVisible() || this.debounceHandle !== undefined) trace('hide');
    window.clearTimeout(this.debounceHandle);
    this.debounceHandle = undefined;
    this.cancelPending();
    this.session = undefined;
    this.state = undefined;
    this.widget.hide();
  }

  /** Requests completions at the current cursor position. */
  trigger(triggerKind: TriggerKind = TriggerKind.Invoked, triggerCharacter?: string) {
    trace('trigger', () => ({ triggerKind: TriggerKind[triggerKind], triggerCharacter }));
    window.clearTimeout(this.debounceHandle);
    this.debounceHandle = window.setTimeout(
      () => this.request(triggerKind, triggerCharacter),
      DEBOUNCE_MS
    );
  }

  /** Accepts the currently highlighted item. Returns false when there is none. */
  acceptSelected(): boolean {
    if (this.state?.kind !== 'items') return false;
    this.accept(this.selected);
    return true;
  }

  private onContentChanged(event: monaco.editor.IModelContentChangedEvent) {
    const text = event.changes.at(-1)?.text ?? '';
    const triggerCharacter = this.triggerCharacters.find((char) => text.endsWith(char));
    if (triggerCharacter) {
      this.trigger(TriggerKind.TriggerCharacter, triggerCharacter);
      return;
    }
    // NOTE: entity lists are always `isIncomplete`, so they are re-requested on
    // every keystroke; static lists are filtered locally instead.
    if (this.session && !this.session.isIncomplete) {
      this.renderSession();
      return;
    }
    if (this.widget.isVisible() || /[\w:?<]$/.test(text)) {
      this.trigger(TriggerKind.Invoked);
    }
  }

  private cancelPending() {
    this.tokenSource?.cancel();
    this.tokenSource?.dispose();
    this.tokenSource = undefined;
  }

  private request(triggerKind: TriggerKind, triggerCharacter?: string) {
    const model = this.monacoEditor.getModel();
    const position = this.monacoEditor.getPosition();
    if (!model || !position) return;

    this.cancelPending();
    const tokenSource = new monaco.CancellationTokenSource();
    this.tokenSource = tokenSource;
    const version = ++this.requestVersion;
    const requestTrace = Trace.start('textDocument/completion', () => ({
      version,
      line: position.lineNumber - 1,
      character: position.column - 1,
      triggerKind: TriggerKind[triggerKind],
      triggerCharacter,
      term: this.currentTerm(this.session?.termStart),
    }));

    this.editor.languageClient
      .sendRequest<CompletionList | CompletionItem[] | null>(
        'textDocument/completion',
        {
          textDocument: { uri: this.editor.getDocumentUri() },
          position: { line: position.lineNumber - 1, character: position.column - 1 },
          context: { triggerKind, triggerCharacter },
        },
        tokenSource.token
      )
      .then((response) => {
        requestTrace?.log('response', () => {
          const items = Array.isArray(response) ? response : (response?.items ?? []);
          return {
            count: items.length,
            isIncomplete: Array.isArray(response) ? false : response?.isIncomplete,
            stale: version !== this.requestVersion,
            items,
          };
        });
        if (version !== this.requestVersion) return;
        this.onResponse(response, position);
      })
      .catch((error: unknown) => {
        requestTrace?.log(isCancellation(error) ? 'cancelled' : 'error', () => ({ error }));
        if (version !== this.requestVersion) return;
        // NOTE: a superseded request rejects as cancelled; showing the error
        // panel for those would make it flash on every keystroke.
        if (isCancellation(error)) return;
        this.showError(error instanceof Error ? error.message : String(error));
      });
  }

  private onResponse(
    response: CompletionList | CompletionItem[] | null,
    position: monaco.IPosition
  ) {
    const list = Array.isArray(response) ? undefined : (response ?? undefined);
    const items = Array.isArray(response) ? response : (list?.items ?? []);
    const isIncomplete = list?.isIncomplete ?? false;

    if (items.length === 0) {
      this.session = undefined;
      this.render({ kind: 'empty', term: this.currentTerm() }, position);
      return;
    }

    // NOTE: the server sets `filterText` to the search term for every entity
    // item so that ordering falls back to `sortText`. Preserve that order.
    const sorted = [...items].sort((a, b) =>
      (a.sortText ?? a.label).localeCompare(b.sortText ?? b.label)
    );
    // NOTE: the built-in call completions carry their snippet format on the
    // list rather than on each item, so the defaults are folded in here and
    // every item downstream is self-describing.
    const defaults = list?.itemDefaults;
    const rendered = sorted
      .map((item) => ({
        ...item,
        insertTextFormat: item.insertTextFormat ?? defaults?.insertTextFormat,
      }))
      .map(toRenderItem);
    const termStart = termStartOf(rendered);
    const anchor = termStart ?? position;
    this.session = {
      term: this.currentTerm(termStart),
      items: rendered,
      isIncomplete,
      anchor,
      termStart,
    };
    this.renderSession();
  }

  /**
   * Renders the current session.
   *
   * Both kinds of list are filtered, but against different text and a
   * different term.
   *
   * A complete list (keywords, snippets) is never re-requested, so it is
   * narrowed against the live term — that is what lets it be re-filtered on
   * later keystrokes — and matches on what is displayed.
   *
   * An `isIncomplete` list is re-requested on every keystroke and is already
   * narrowed by the server, so its order is kept untouched and it is matched
   * on `filterText` against the term the server saw. The server sets
   * `filterText` to that very search term on every entity item, so they all
   * survive; the variable items merged into the same list keep their own name
   * there, which is what drops a `?label` suggestion once the term is
   * `Mathe`. Using the server's term rather than the live one keeps the
   * entity items from all blinking out for the one round trip it takes a
   * keystroke to come back.
   */
  private renderSession() {
    const session = this.session;
    if (!session) return;
    const term = this.currentTerm(session.termStart);
    // NOTE: escaped because the term is source text. `parseKeywords` drops a
    // token that is not a valid regex, and an empty keyword list matches
    // everything — so `?abas` would leave the list unfiltered.
    const keywords = parseKeywords(escapeRegExp(session.isIncomplete ? session.term : term));
    const items = session.items.filter((renderItem) =>
      matchesAllKeywords(filterTextOf(renderItem, session.isIncomplete), keywords)
    );
    trace('local filter', () => ({ term, kept: items.length, of: session.items.length }));
    if (items.length === 0) {
      this.render({ kind: 'empty', term }, session.anchor);
      return;
    }
    this.render({ kind: 'items', items, term }, session.anchor);
  }

  private showError(message: string) {
    // NOTE: the server reports a failure to localize the cursor for every
    // position it has no completions for. That is not something the user can
    // act on, so it dismisses rather than raising the error panel.
    if (message.startsWith('Could not localize cursor')) {
      this.hide();
      return;
    }
    const position = this.monacoEditor.getPosition();
    if (!position) return;
    const term = this.currentTerm(this.session?.termStart);
    this.session = undefined;
    this.render({ kind: 'error', message, term }, position);
  }

  private render(state: CompletionState, position: monaco.IPosition) {
    this.state = state;
    this.selected = 0;
    this.widget.show(state, position, this.selected);
  }

  /**
   * The text being completed, used for filtering and highlighting.
   *
   * NOTE: the term is not necessarily a word. `?a rdfs:label Algorithmen und`
   * completes on the whole label, spaces and all. So it runs from the start of
   * the range the server replaces to the cursor — the same rule Monaco's own
   * suggest widget uses. The word scan is only a fallback for before the first
   * response has arrived, when no range is known yet.
   */
  private currentTerm(anchor?: monaco.IPosition): string {
    const model = this.monacoEditor.getModel();
    const position = this.monacoEditor.getPosition();
    if (!model || !position) return '';
    const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
    if (anchor?.lineNumber === position.lineNumber && anchor.column <= position.column) {
      return line.slice(anchor.column - 1);
    }
    return /[\w:?<]*$/.exec(line)?.[0] ?? '';
  }

  private move(delta: number) {
    if (this.state?.kind !== 'items') return;
    const count = this.state.items.length;
    this.selected = (this.selected + delta + count) % count;
    this.widget.select(this.selected);
  }

  private accept(index: number) {
    if (this.state?.kind !== 'items') return;
    const item = this.state.items[index]?.item;
    if (!item) return;
    trace('accept', () => ({ index, item }));
    this.hide();
    this.applyItem(item);
  }

  private applyItem(item: CompletionItem) {
    const model = this.monacoEditor.getModel();
    if (!model) return;

    const range = this.replaceRange(item);
    const newText = item.textEdit?.newText ?? item.insertText ?? item.label;
    const additionalEdits = (item.additionalTextEdits ?? []).map((edit) => ({
      range: toMonacoRange(edit.range),
      text: edit.newText,
    }));

    if (item.insertTextFormat !== SNIPPET_FORMAT) {
      // NOTE: all ranges are against the current model, so one call applies the
      // PREFIX insert and the replacement together with correct offsets.
      this.monacoEditor.executeEdits('completion', [
        ...additionalEdits,
        { range, text: newText, forceMoveMarkers: true },
      ]);
      return this.runCommand(item);
    }

    // NOTE: `SnippetController2.apply` gives every edit it is handed its own
    // final tabstop, which would leave one cursor per additional edit. So the
    // additional edits are applied first and only the snippet goes through the
    // controller. A tracked decoration carries the snippet's range across that
    // first edit, which shifts it down by the inserted PREFIX line.
    const [markerId] = model.deltaDecorations([], [{ range, options: {} }]);
    if (additionalEdits.length > 0) {
      this.monacoEditor.executeEdits('completion', additionalEdits);
    }
    const snippetRange = model.getDecorationRange(markerId) ?? range;
    model.deltaDecorations([markerId], []);

    const controller = this.monacoEditor.getContribution('snippetController2') as unknown as {
      apply(
        edits: { range: monaco.Range; template: string }[],
        options?: Record<string, unknown>
      ): void;
    } | null;
    if (controller) {
      controller.apply([{ range: snippetRange, template: newText }], {
        adjustWhitespace: false,
        undoStopBefore: true,
        undoStopAfter: true,
      });
    } else {
      this.monacoEditor.executeEdits('completion', [
        { range: snippetRange, text: escapeSnippet(newText), forceMoveMarkers: true },
      ]);
    }

    return this.runCommand(item);
  }

  /**
   * Runs an accepted item's `command`.
   *
   * Monaco's suggest controller used to do this; the server relies on it to
   * chain a follow-up completion.
   */
  private runCommand(item: CompletionItem) {
    if (item.command?.command === 'triggerNewCompletion') {
      this.trigger(TriggerKind.Invoked);
    } else if (item.command) {
      this.monacoEditor.trigger('completion', item.command.command, item.command.arguments);
    }
  }

  /**
   * The range an accepted item replaces.
   *
   * NOTE: a complete list is filtered locally rather than re-requested, so by
   * the time an item is accepted the server's range can be several keystrokes
   * old and end before the cursor. Everything typed since belongs to the term
   * the item was picked for, so the range is extended to the cursor — the same
   * thing Monaco's own suggest controller does.
   */
  private replaceRange(item: CompletionItem): monaco.Range {
    if (!item.textEdit) return this.wordRange();
    const range = toMonacoRange(item.textEdit.range);
    const position = this.monacoEditor.getPosition();
    if (!position) return range;
    if (position.lineNumber !== range.endLineNumber) return range;
    if (position.column <= range.endColumn) return range;
    return range.setEndPosition(position.lineNumber, position.column);
  }

  private wordRange(): monaco.Range {
    const position = this.monacoEditor.getPosition()!;
    const term = this.currentTerm();
    return new monaco.Range(
      position.lineNumber,
      position.column - term.length,
      position.lineNumber,
      position.column
    );
  }

  private onKeyDown(event: monaco.IKeyboardEvent) {
    if (!this.widget.isVisible()) return;
    const consume = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    switch (event.keyCode) {
      case monaco.KeyCode.DownArrow:
        this.move(1);
        return consume();
      case monaco.KeyCode.UpArrow:
        this.move(-1);
        return consume();
      case monaco.KeyCode.PageDown:
        this.move(10);
        return consume();
      case monaco.KeyCode.PageUp:
        this.move(-10);
        return consume();
      case monaco.KeyCode.Enter:
        if (this.acceptSelected()) consume();
        return;
      case monaco.KeyCode.Escape:
        this.hide();
        return consume();
      case monaco.KeyCode.Tab:
        // NOTE: Tab never accepts. It dismisses the popup and the event is
        // deliberately left to travel on, so the jump command takes over.
        this.hide();
        return;
      default:
        return;
    }
  }
}

/** The text an item is matched against. */
function filterTextOf(renderItem: RenderItem, isIncomplete: boolean): string {
  if (isIncomplete) return renderItem.item.filterText ?? renderItem.item.label;
  return `${renderItem.primary} ${renderItem.secondary ?? ''}`;
}

/** Monaco/JSON-RPC report a cancelled request in a few different shapes. */
function isCancellation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === REQUEST_CANCELLED) return true;
  return (error as { name?: string }).name === 'Canceled';
}

/** Escapes text so `SnippetController2` inserts it literally. */
function escapeSnippet(text: string): string {
  return text.replace(/\$|}|\\/g, '\\$&');
}

function toRenderItem(item: CompletionItem): RenderItem {
  const detail = item.labelDetails?.detail ?? '';
  // NOTE: what `labelDetails.detail` holds depends on the kind. For entities it
  // is the human readable name, formatted "{label}/{alias}", and the item's own
  // label is the curie — so the name leads and the curie sits underneath. For
  // everything else (keywords, snippets, built-in calls) the label is already
  // the name and the detail is a signature.
  const isEntity = item.kind === VALUE_KIND;
  const primary = (isEntity ? detail.split('/')[0] : item.label) || item.label;
  const secondary = (isEntity ? item.label : detail) || null;
  return {
    item,
    primary,
    secondary,
    score: parseScore(item.documentation),
    range: item.textEdit?.range ?? null,
  };
}

/** The server currently only reports the usage count inside `documentation`. */
function parseScore(documentation: string | undefined): number | null {
  const match = documentation ? /^Score: (\d+)$/m.exec(documentation) : null;
  return match ? Number(match[1]) : null;
}

/**
 * The start of the range the items replace, when any of them carries one.
 *
 * Doubles as the widget's anchor, so the popup sits at the start of the term
 * and does not drift as the term grows. Items built from `insertText` alone —
 * the solution modifier keywords, for one — carry no range at all, and there
 * is then no term start to be had.
 */
function termStartOf(items: RenderItem[]): monaco.IPosition | undefined {
  const range: Range | null = items.find((item) => item.range)?.range ?? null;
  if (!range) return undefined;
  return { lineNumber: range.start.line + 1, column: range.start.character + 1 };
}
