import type { Backend } from '../types/backend';
import type { EditorAndLanguageClient } from '../types/monaco';
import { getPathParameters } from '../utils';

export async function setup(editorAndLanguageClient: EditorAndLanguageClient) {
  const shareButton = document.getElementById('shareButton')!;
  const shareModal = document.getElementById('shareModal')!;
  const share = document.getElementById('share')!;
  const shareLink3 = document.getElementById('shareLink3')!;
  const shareLink4 = document.getElementById('shareLink4')!;
  const shareLink5 = document.getElementById('shareLink5')!;
  const shareLink6 = document.getElementById('shareLink6')!;

  shareButton.addEventListener('click', async () => {

    const query = editorAndLanguageClient.editorApp.getEditor()!.getValue();

    if (query.trim() === "") {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: {
          type: "warning",
          message: "There is nothing to share.",
          duration: 3000
        }
      }));
      return
    }

    shareModal.classList.remove('hidden');

    const [slug, _] = getPathParameters();
    const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Backend;

    // NOTE: URL to this query in the QLever UI (long, with full query string) 
    const url1 = new URL(window.location.origin)
    url1.pathname = slug!;
    url1.searchParams.set("query", encodeURIComponent(query));
    shareLink3.textContent = url1.toString();

    // NOTE: URL for GET request (for use in web apps, etc.)
    const url2 = new URL(backend.url);
    url2.searchParams.set("query", encodeURIComponent(query));
    shareLink4.textContent = url2.toString();

    // NOTE: cURL command line for POST request (application/sparql-results+json): 
    const normalized = query.replace(/\s+/g, " ").trim();
    const escaped = normalized.replace(/"/g, '\\"');
    shareLink5.textContent = `curl -s ${backend.url} -H "Accept: application/sparql-results+json" -H "Content-type: application/sparql-query" --data "${escaped}"`

    // NOTE:  cURL command line for GET request (application/qlever-results+json): 
    shareLink6.textContent = `curl -s ${backend.url} -H "Accept: application/qlever-results+json" --data-urlencode "query=${escaped}"`;

  });
  shareModal.addEventListener('click', () => {
    shareModal.classList.add('hidden');
  });
  share.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  share.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(button.previousElementSibling!.textContent!.trim());
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'success',
            message: 'Copied to clipboard',
            duration: 2000,
          },
        })
      );
    });
  });
}
