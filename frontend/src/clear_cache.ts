import type { Service } from "./types/backend";
import type { EditorAndLanguageClient } from "./types/monaco";

export async function setupClearCache(editorAndLanguageClient: EditorAndLanguageClient) {
  const clearCacheButton = document.getElementById("clearCacheButton")!;

  clearCacheButton.addEventListener('click', async () => {
    clearCache(editorAndLanguageClient);
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          type: 'success',
          message: 'Cache cleared.',
          duration: 2000,
        },
      })
    );
  });
}

export async function clearCache(editorAndLanguageClient: EditorAndLanguageClient) {
  const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service | null;
  if (!backend) {
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          type: 'warning',
          message: 'No SPARQL endpoint configured.',
          duration: 2000,
        },
      })
    );
  } else {
    fetch(backend.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: new URLSearchParams({ cmd: "clear-cache" })
    });
  }

}
