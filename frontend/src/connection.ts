import type { Editor } from './editor/init';
import type { PingBackendResult } from './types/lsp_messages';

const CHECK_PERIODE_MS = 5_000;
let checkTimer: ReturnType<typeof setTimeout> | null = null;

export function endpointAvailability(editor: Editor) {
  const indicator = document.getElementById('AvailabilityIndicator')! as HTMLElement;
  const checkAvailiablityPeriodically = () => {
    editor.languageClient
      .sendRequest('qlueLs/pingBackend', {})
      .then((response) => {
        const pingResult = response as PingBackendResult;
        indicator.dataset.state = pingResult.available ? 'success' : 'error';
      })
      .catch(() => {
        indicator.dataset.state = 'error';
      });

    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      checkAvailiablityPeriodically();
    }, CHECK_PERIODE_MS);
  };

  document.addEventListener('backend-selected', () => {
    checkAvailiablityPeriodically();
  });
}
