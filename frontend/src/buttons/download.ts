import type { IdentifyOperationTypeResult } from '../types/lsp_messages';
import type { EditorAndLanguageClient } from '../types/monaco';

export function setup(editorAndLanguageClient: EditorAndLanguageClient) {
  const downloadButton = document.getElementById('downloadButton')!;
  downloadButton.addEventListener('click', async () => {
    // NOTE: Check operation type.
    let response = (await editorAndLanguageClient.languageClient.sendRequest(
      'qlueLs/identifyOperationType',
      {
        textDocument: {
          uri: editorAndLanguageClient.editorApp.getEditor()!.getModel()!.uri.toString(),
        },
      }
    )) as IdentifyOperationTypeResult;
    if (response.operationType != 'Query') {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'warning',
            message: 'This is not a query.<br>There is nothing to download.',
            duration: 2000,
          },
        })
      );
      return;
    }

    // NOTE: Check for empty query.
    let query = editorAndLanguageClient.editorApp.getEditor()!.getValue();
    if (query.trim() === '') {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { type: 'warning', message: 'There is no query to execute :(', duration: 2000 },
        })
      );
      return;
    }

    // NOTE: Fetch and download data.
    const data_url = `https://qlever.dev/api/wikidata?query=${encodeURIComponent(query)}&action=tsv_export`;
    fetch(data_url).then(async (response) => {
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
    });
  });
}
