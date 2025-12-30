import type { Editor } from './editor/init';
import { getSavedQuery } from './share';

export function handleRequestParameter(editor: Editor) {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('query');
  if (query) {
    editor.setContent(query);
  }
  // NOTE: if there is a saved-query id fetch and show the query
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length == 2) {
    getSavedQuery(segments[1]).then((query) => {
      editor.setContent(query);
    });
  }
  const exec = params.get('exec');
  if (exec) {
    window.dispatchEvent(new Event('execute-start-request'));
  }
}
