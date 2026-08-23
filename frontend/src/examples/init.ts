import { apiFetch } from '../api';
import type { Editor } from '../editor/init';
import { canReorder, createDragHandle, setupDragReorder } from './drag_reorder';
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

  let currentSlug = '';
  setupDragReorder(document.getElementById('examplesList')! as HTMLUListElement, () => currentSlug);

  document.addEventListener('backend-selected', (e: Event) => {
    currentSlug = (e as CustomEvent<string>).detail;
    clearExamples();
    loadExamples(editor, currentSlug);
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
  const reorderable = canReorder();
  for (const example of examples) {
    const li = document.createElement('li');
    li.classList =
      'flex items-center gap-2 rounded-md px-2.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer';
    li.dataset.query = example.query;
    li.dataset.name = example.name;
    if (reorderable) li.appendChild(createDragHandle(li));
    const span = document.createElement('span');
    // NOTE: the keyword search rewrites this span to highlight matches, so it
    // must stay separate from the drag handle.
    span.className = 'example-name';
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
