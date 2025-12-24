import { MonacoLanguageClient } from 'monaco-languageclient';
import type { Service } from './types/backend';
import type { EditorAndLanguageClient } from './types/monaco';
import { getEditorContent, getPathParameters } from './utils';;

export async function setupShare(editorAndLanguageClient: EditorAndLanguageClient) {
  const shareButton = document.getElementById('shareButton')!;
  const shareModal = document.getElementById('shareModal')!;
  const share = document.getElementById('share')!;
  const shareLink1 = document.getElementById('shareLink1')!;
  const shareLink2 = document.getElementById('shareLink2')!;
  const shareLink3 = document.getElementById('shareLink3')!;
  const shareLink4 = document.getElementById('shareLink4')!;
  const shareLink5 = document.getElementById('shareLink5')!;
  const shareLink6 = document.getElementById('shareLink6')!;
  const shareLink7 = document.getElementById('shareLink7')!;

  shareButton.addEventListener('click', async () => {
    const query = editorAndLanguageClient.editorApp.getEditor()!.getValue();

    if (query.trim() === "") {
      document.dispatchEvent(new CustomEvent('toast', {
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
    const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service;
    const shareLinkId = await getShareLinkId(query);

    // NOTE: URL to this query in the QLever UI (short, with query hash)
    const url1 = new URL(`${slug}/${shareLinkId}`, window.location.origin);
    shareLink1.textContent = url1.toString();

    // NOTE: URL to this query in the QLever UI (short, with query hash, execute automatically) 
    const url2 = new URL(`${slug}/${shareLinkId}?exec=true`, window.location.origin);
    shareLink2.textContent = url2.toString();

    // NOTE: URL to this query in the QLever UI (long, with full query string)
    const url3 = new URL(window.location.origin)
    url3.pathname = slug!;
    url3.searchParams.set("query", encodeURIComponent(query));
    shareLink3.textContent = url3.toString();

    // NOTE: URL for GET request (for use in web apps, etc.)
    const url4 = new URL(backend.url);
    url4.searchParams.set("query", encodeURIComponent(query));
    shareLink4.textContent = url4.toString();

    // NOTE: cURL command line for POST request (application/sparql-results+json): 
    const normalized = query.replace(/\s+/g, " ").trim();
    const escaped = normalized.replace(/"/g, '\\"');
    shareLink5.textContent = `curl -s ${backend.url} -H "Accept: application/sparql-results+json" -H "Content-type: application/sparql-query" --data "${escaped}"`

    // NOTE:  cURL command line for GET request (application/qlever-results+json): 
    shareLink6.textContent = `curl -s ${backend.url} -H "Accept: application/qlever-results+json" --data-urlencode "query=${escaped}"`;

    // NOTE:  Unescaped query in one line
    shareLink7.textContent = normalized.replace(/\n|\r\n/, " ");

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
      document.dispatchEvent(
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

/// Takes the query and gets a shareLink id for this query.
export async function getShareLinkId(query: string): Promise<string> {
  return await fetch(`${import.meta.env.VITE_API_URL}/api/share/`, {
    method: 'POST',
    body: query
  }
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Could not aquire share link`);
    }
    return response.text()
  });
}

export function setShareLink(editorAndLanguageClient: EditorAndLanguageClient, backend: Service) {
  const query = getEditorContent(editorAndLanguageClient);
  getShareLinkId(query).then(id => {
    history.pushState({}, "", `/${backend.name}/${id}${window.location.search}`)
  });
}

/// Takes a ShareLink id and responds the corisponding query
export async function getSavedQuery(id: string): Promise<string> {
  return await fetch(`${import.meta.env.VITE_API_URL}/api/share/${id}`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not aquire share link`);
      }
      return response.text()
    });
}
