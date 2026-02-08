import type { Editor } from '../editor/init';
import type { QlueLsServiceConfig } from '../types/backend';

export async function setupClearCache(editor: Editor) {
  const clearCacheButton = document.getElementById('clearCacheButton')!;

  clearCacheButton.addEventListener('click', async () => {
    clearCache(editor);
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

export async function clearCache(editor: Editor) {
  const backend = (await editor.languageClient.sendRequest(
    'qlueLs/getBackend',
    {}
  )) as QlueLsServiceConfig | { error: string };
  if ('error' in backend) {
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({ cmd: 'clear-cache' }),
    });
  }
}
