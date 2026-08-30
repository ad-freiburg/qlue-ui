// ┌─────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import type { Range, TextEdit } from '../../types/lsp_messages';

/** `insertTextFormat` value marking an item whose text is a snippet template. */
export const SNIPPET_FORMAT = 2;

/** `CompletionItemKind.Value`, the kind the server uses for RDF entities. */
export const VALUE_KIND = 12;

export interface CompletionItemLabelDetails {
  detail?: string;
  description?: string;
}

export interface CompletionCommand {
  title: string;
  command: string;
  arguments?: unknown[];
}

export interface CompletionItem {
  label: string;
  labelDetails?: CompletionItemLabelDetails;
  kind?: number;
  detail?: string;
  documentation?: string;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  textEdit?: TextEdit;
  insertTextFormat?: number;
  additionalTextEdits?: TextEdit[];
  command?: CompletionCommand;
}

/** Values a `CompletionList` applies to every item that does not set them. */
export interface ItemDefaults {
  insertTextFormat?: number;
}

export interface CompletionList {
  isIncomplete: boolean;
  itemDefaults?: ItemDefaults;
  items: CompletionItem[];
}

/** What the widget currently displays. */
export type CompletionState =
  | { kind: 'items'; items: RenderItem[]; term: string }
  | { kind: 'empty'; term: string }
  | { kind: 'error'; message: string; term: string };

/** A completion item plus the presentation data derived from it. */
export interface RenderItem {
  item: CompletionItem;
  /** Primary line: the human readable label, or the raw label when there is none. */
  primary: string;
  /** Secondary line: the curie, shown only when it differs from `primary`. */
  secondary: string | null;
  /** Usage count, when the server reported one. */
  score: number | null;
  /** Range this item replaces, used to anchor the widget. */
  range: Range | null;
}
