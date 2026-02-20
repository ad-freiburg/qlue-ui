import type { Editor } from './editor/init';
import { openParseTree } from './parse_tree/init';
import { getSavedQuery } from './share';
import { openOrCreateTab } from './tabs';

/**
 * Handles URL-based parameters to configure the editor on page load.
 *
 * Supported parameters:
 * - `?query=<sparql>` — populates the editor with the given query string
 * - `/<backend>/<id>` (path) — loads a saved query by its short ID
 * - `?exec` — automatically executes the query after loading
 * - `?parseTree` — opens the parse tree panel
 */
export async function handleRequestParameter(editor: Editor) {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('query');
  if (query) {
    editor.setContent(query);
  }
  // NOTE: if there is a saved-query id fetch and show the query in a new tab
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length == 2) {
    const shareId = segments[1];
    const query = await getSavedQuery(shareId);
    await openOrCreateTab(editor, shareId, query);
  }
  const exec = params.get('exec');
  if (exec) {
    window.dispatchEvent(new Event('execute-start-request'));
  }

  const parseTree = params.get('parseTree');
  if (parseTree) {
    openParseTree(editor);
  }

  // Clean URL after consuming inbound parameters, keeping only the backend slug
  const slug = segments[0];
  if (slug) {
    history.replaceState(null, '', `/${slug}`);
  } else {
    history.replaceState(null, '', '/');
  }
}
