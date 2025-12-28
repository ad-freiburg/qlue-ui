import { getSavedQuery } from "./share";
import type { EditorAndLanguageClient } from "./types/monaco";
import { setEditorContent } from "./utils";

export function handleRequestParameter(editorAndLanguageClient: EditorAndLanguageClient) {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query");
  if (query) {
    setEditorContent(editorAndLanguageClient, query);
  }
  // NOTE: if there is a saved-query id fetch and show the query
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length == 2) {
    getSavedQuery(segments[1]).then(query => {
      setEditorContent(editorAndLanguageClient, query);
    });
  }
  const exec = params.get("exec");
  if (exec) {
    window.dispatchEvent(new Event("execute-start-request"));
  }
}



