import { apiFetch } from '../api';
import type { Editor } from '../editor/init';
import { setupKeywordSearch } from './keyword_search';
import { clearExamples, closeExamples, handleClickEvents } from './utils';

interface QueryExample {
  name: string;
  query: string;
}

/**
 * Initializes the example queries panel. Listens for backend-selection
 * changes and fetches the corresponding example queries from the API.
 * Selecting an example populates the editor with its query text.
 */
export async function setupExamples(editor: Editor) {
  handleClickEvents();
  setupKeywordSearch();

  document.addEventListener('backend-selected', (e: Event) => {
    clearExamples();
    loadExamples(editor, (e as CustomEvent<string>).detail);
  });
}

export async function loadExamples(editor: Editor, serviceSlug: string) {
  const examplesList = document.getElementById('examplesList')!;

  const examples = (await apiFetch(`endpoints/${serviceSlug}/examples/`)
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
    })) as QueryExample[];

  const fragment = new DocumentFragment();
  for (const example of examples) {
    const li = document.createElement('li');
    li.classList =
      'rounded-md px-2.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer';
    li.dataset.query = example.query;
    const span = document.createElement('span');
    span.innerText = example.name;
    li.appendChild(span);
    li.onclick = () => {
      editor.setContent(example.query);
      closeExamples();
      document.dispatchEvent(
        new CustomEvent('example-selected', {
          detail: { name: example.name, service: serviceSlug },
        })
      );
      setTimeout(() => editor.focus(), 50);
    };
    fragment.appendChild(li);
  }
  examplesList.appendChild(fragment);
  document.dispatchEvent(new Event('examples-loaded'));
}
