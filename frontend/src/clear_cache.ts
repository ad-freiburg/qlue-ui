import type { Backend } from "./types/backend";
import type { EditorAndLanguageClient } from "./types/monaco";

export async function setupClearCache(editorAndLanguageClient: EditorAndLanguageClient) {
  const clearCacheButton = document.getElementById("clearCacheButton")!;

  clearCacheButton.addEventListener('click', async () => {
    const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Backend | null;
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
