import type { EditorAndLanguageClient } from './types/monaco';

export function setupExamples(editorAndLanguageClient: EditorAndLanguageClient) {
  const examplesButton = document.getElementById('examplesButton');
  const examplesModal = document.getElementById('examplesModal')!;
  const examplesKeywordSearchInput = document.getElementById('examplesKeywordSearchInput')!;

  examplesButton?.addEventListener('click', () => {
    examplesModal.classList.remove('hidden');
    examplesKeywordSearchInput.focus();
  });

  examplesModal.addEventListener('click', (e) => {
    examplesModal.classList.add('hidden');
  });

  const backendSelector = document.getElementById('backendSelector') as HTMLSelectElement;
  backendSelector.addEventListener('select', () => {
    loadExamples(backendSelector.value);
  });

  // NOTE: Query Examples
  document.querySelectorAll('.queryExample')!.forEach((element) => {
    element.addEventListener('click', () => {
      editorAndLanguageClient.editorApp.getEditor()!.setValue(element.getAttribute('value')!);
      editorAndLanguageClient.editorApp.getEditor()!.focus();
    });
  });
}

async function loadExamples(slug: string) {
  const backends = await fetch(`${import.meta.env.VITE_API_URL}/api/examples/${slug}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error while fetching backends: \nstatus: ${response.status} \nmessage: ${response.statusText} `
        );
      }
      return response.json();
    })

    .catch((err) => {
      console.error('Error while fetching backends list:', err);
      return [];
    });
}
