// NOTE: In-memory history of the completion queries the language server ran.
// Fed by the `qlueLs/completionQuery` notification, rendered by the templates panel.

import type { Editor } from '../editor/init';

const CAPACITY = 50;

export interface CompletionRun {
  /** Tera template name, `"<backend>-<templateKey>"`. */
  template: string;
  /** The rendered query. Empty if the template could not be rendered. */
  query: string;
  url: string;
  durationMs: number;
  /** Bindings returned by the endpoint, before search-term filtering. */
  resultCount?: number;
  error?: string;
  at: number;
}

/** Newest first, capped at `CAPACITY`. */
const runs: CompletionRun[] = [];

export function getRuns(): CompletionRun[] {
  return runs;
}

export function clearRuns() {
  runs.length = 0;
  document.dispatchEvent(new Event('completion-run-logged'));
}

/** Starts collecting completion queries. Runs are collected while the panel is closed too. */
export function setupCompletionRuns(editor: Editor) {
  editor.languageClient.onNotification(
    'qlueLs/completionQuery',
    (params: Omit<CompletionRun, 'at'>) => {
      // NOTE: The server omits `resultCount`/`error` when absent, but be robust against
      // an explicit null so the renderer only has to check for `undefined`.
      runs.unshift({
        ...params,
        resultCount: params.resultCount ?? undefined,
        error: params.error ?? undefined,
        at: Date.now(),
      });
      if (runs.length > CAPACITY) runs.pop();
      document.dispatchEvent(new Event('completion-run-logged'));
    }
  );
}
