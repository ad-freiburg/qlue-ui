import type { EditorAndLanguageClient } from '../types/monaco';
import { getPathParameters } from '../utils';

export function setup(editorAndLanguageClient: EditorAndLanguageClient) {
  const shareButton = document.getElementById('shareButton')!;
  const shareModal = document.getElementById('shareModal')!;
  const share = document.getElementById('share')!;
  const shareLink3 = document.getElementById('shareLink3')!;


  shareButton.addEventListener('click', () => {
    shareModal.classList.remove('hidden');
    const query = editorAndLanguageClient.editorApp.getEditor()!.getValue();
    const [slug, _] = getPathParameters();
    const url = new URL(window.location.origin)
    url.pathname = slug!;
    url.searchParams.set("query", encodeURIComponent(query));
    shareLink3.textContent = url.toString();

    // editorAndLanguageClient.languageClient.sendRequest()

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
