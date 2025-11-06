import { executeQuery } from './network/execute';
import type { EditorAndLanguageClient } from './types/monaco';

export function setupButtons(editorAndLanguageClient: EditorAndLanguageClient) {
  // NOTE: Format button
  document.getElementById('formatButton')!.addEventListener('click', () => {
    editorAndLanguageClient.editorApp
      .getEditor()!
      .trigger('button', 'editor.action.formatDocument', {});
  });

  // NOTE: Download button
  const downloadButton = document.getElementById('downloadButton')!;
  downloadButton.addEventListener('click', () => {
    // TODO: Only support donload on queries not updates.
    let query = editorAndLanguageClient.editorApp.getEditor()!.getValue();
    if (query.trim() === "") {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { type: 'warning', message: 'There is no query to execute :(', duration: 2000 },
        })
      );
      return
    }
    const data_url = `https://qlever.dev/api/wikidata?query=${encodeURIComponent(query)}&action=tsv_export`;
    fetch(data_url)
      .then(async response => {
        if (!response.ok) {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { type: 'warning', message: 'The download failed.', duration: 3000 },
            })
          );
          throw new Error(`Download request failed: ${response.status}`);
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'data.tsv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      })
  });
}
