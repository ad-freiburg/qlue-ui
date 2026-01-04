import type { Editor } from '../editor/init';
import { setupKeywordSearch } from './keyword_search';

export async function setupExamples(editor: Editor) {
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

  document.addEventListener('backend-selected', (e: Event) => loadExamples(editor, (e as CustomEvent<string>).detail));

  setupKeywordSearch();
}

async function loadExamples(editor: Editor, serviceSlug: string) {
  const examplesList = document.getElementById('examplesList')!;
  const examplesModal = document.getElementById('examplesModal')!;


  let examples = await fetch(
    `${import.meta.env.VITE_API_URL}/api/backends/${serviceSlug}/examples`
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
    li.classList = 'text-neutral-500 hover:text-neutral-200 dark:text-white p-2 hover:bg-neutral-500  hover:dark:bg-neutral-700 cursor-pointer';
    li.dataset.query = example.query;
    const span = document.createElement('span');
    span.innerText = example.name;
    li.appendChild(span);
    li.onclick = () => {
      editor.setContent(example.query);
      examplesModal.classList.add('hidden');
      document.dispatchEvent(new Event('example-selected'));
      setTimeout(() => editor.focus(), 50);
    };
    fragment.appendChild(li);
  }
  examplesList.appendChild(fragment);
  document.dispatchEvent(new Event('examples-loaded'));
}
