import type { Editor } from '../editor/init';
import { SparqlEngine, type IdentifyOperationTypeResult, type SparqlService } from '../types/lsp_messages';

export function setupDownload(editor: Editor) {
  const downloadButton = document.getElementById('downloadButton')!;
  downloadButton.addEventListener('click', async () => {
    // NOTE: Check for empty query.
    let query = editor.getContent();
    if (query.trim() === '') {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: { type: 'warning', message: 'There is no query to execute :(', duration: 2000 },
        })
      );
      return;
    }

    // NOTE: Check operation type.
    let response = (await editor.languageClient.sendRequest(
      'qlueLs/identifyOperationType',
      {
        textDocument: {
          uri: editor.getDocumentUri()
        },
      }
    )) as IdentifyOperationTypeResult;
    if (response.operationType != 'Query') {
      document.dispatchEvent(
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

    let sparqlService = await editor.languageClient.sendRequest("qlueLs/getBackend").then(response => {
      if (response) {
        const typedResponse = response as SparqlService;
        return typedResponse;
      }
      throw new Error(
        `Could not determine sparqlService`
      );
    });

    // NOTE: Fetch and download data if the engine is QLever.
    if (sparqlService.engine === SparqlEngine.QLever) {
      const data_url = `${sparqlService.url}?query=${encodeURIComponent(query)}&action=tsv_export`;
      fetch(data_url).then(async (response) => {
        if (!response.ok) {
          document.dispatchEvent(
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
    } else {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: { type: 'error', message: 'Download is currently only supported<br>for QLever-SPARQL-endpoints', duration: 2000 },
        })
      );
    }
  });
}
