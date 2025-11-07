import type { EditorAndLanguageClient } from '../types/monaco';

export function setup(editorAndLanguageClient: EditorAndLanguageClient) {
  const formatButton = document.getElementById('formatButton')!;
  formatButton.addEventListener('click', () => {
    editorAndLanguageClient.editorApp
      .getEditor()!
      .trigger('button', 'editor.action.formatDocument', {});
  });
}
