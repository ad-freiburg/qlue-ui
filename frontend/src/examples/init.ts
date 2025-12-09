import type { EditorAndLanguageClient } from '../types/monaco';
import { setupKeywordSearch } from './keyword_search';

export async function setupExamples(editorAndLanguageClient: EditorAndLanguageClient) {
  const examplesButton = document.getElementById('examplesButton')!;
  const examplesModal = document.getElementById('examplesModal')!;
  const examplesSearch = document.getElementById('examplesSearch')!;
  const examplesKeywordSearchInput = document.getElementById(
    'examplesKeywordSearchInput'
  )! as HTMLInputElement;

  examplesButton.addEventListener('click', () => {
    examplesModal.classList.remove('hidden');
    examplesKeywordSearchInput.focus();
    examplesKeywordSearchInput.value = '';
  });

  examplesModal.addEventListener('click', () => {
    examplesModal.classList.add('hidden');
    document.dispatchEvent(new Event('examples-closed'));
  });

  examplesSearch.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('backend-selected', () => loadExamples(editorAndLanguageClient));

  setupKeywordSearch();
}

async function loadExamples(editorAndLanguageClient: EditorAndLanguageClient) {
  const backendSelector = document.getElementById('backendSelector')! as HTMLSelectElement;
  const examplesList = document.getElementById('examplesList')!;
  const examplesModal = document.getElementById('examplesModal')!;

  examplesList.innerHTML = '';
  const backend_slug = backendSelector.value;

  let examples = await fetch(
    `${import.meta.env.VITE_API_URL}/api/backends/${backend_slug}/examples`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error while fetching backend examples: \nstatus: ${response.status} \nmessage: ${response.statusText} `
        );
      }
      return response.json();
    })
    .catch((err) => {
      console.error('Error while fetching backends examples:', err);
      return [];
    });

  const fragment = new DocumentFragment();
  for (const example of examples) {
    const li = document.createElement('li');
    li.classList = 'p-2 hover:bg-neutral-500  hover:dark:bg-neutral-700 cursor-pointer';
    li.dataset.query = example.query;
    const span = document.createElement('span');
    span.innerText = example.name;
    li.appendChild(span);
    li.onclick = () => {
      editorAndLanguageClient.editorApp.getEditor()!.setValue(example.query);
      examplesModal.classList.add('hidden');
      document.dispatchEvent(new Event('example-selected'));
      setTimeout(() => editorAndLanguageClient.editorApp.getEditor()!.focus(), 50);
    };
    fragment.appendChild(li);
  }
  examplesList.appendChild(fragment);
  document.dispatchEvent(new Event('examples-loaded'));
}
