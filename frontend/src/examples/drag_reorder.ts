// ┌──────────────────────────────────────┐ \\
// │ Copyright © 2024-2026 Ioannis Nezis  │ \\
// ├──────────────────────────────────────┤ \\
// │ Licensed under the MIT license.      │ \\
// └──────────────────────────────────────┘ \\

import { apiFetch, clearApiKey, getApiKey } from '../api';
import { settings } from '../settings/init';

function toast(type: 'success' | 'error', message: string) {
  document.dispatchEvent(
    new CustomEvent('toast', {
      detail: { type, message, duration: 3000 },
    })
  );
}

/** Reordering is a privileged operation; only offer it once a token is stored.
 * We deliberately do not prompt for one just to render the drag handles. */
export function canReorder(): boolean {
  return settings.general.uiToken !== '';
}

const DRAGGING_CLASSES = ['opacity-40'];

/** The example currently being dragged, or null while no drag is in progress. */
let dragged: HTMLLIElement | null = null;
/** The order at drag start, so a failed request can be rolled back. */
let orderBeforeDrag: HTMLLIElement[] = [];

function names(list: HTMLUListElement): string[] {
  return Array.from(list.children).map((li) => (li as HTMLLIElement).dataset.name ?? '');
}

/** Returns the example the pointer is currently above, or null when it is
 * below the last one — in which case the dragged example goes to the end. */
function exampleAfter(list: HTMLUListElement, y: number): HTMLLIElement | null {
  const candidates = Array.from(list.querySelectorAll<HTMLLIElement>('li:not(.dragging)'));
  let closest: { offset: number; element: HTMLLIElement | null } = {
    offset: Number.NEGATIVE_INFINITY,
    element: null,
  };
  for (const candidate of candidates) {
    const box = candidate.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: candidate };
    }
  }
  return closest.element;
}

function rollback(list: HTMLUListElement) {
  list.append(...orderBeforeDrag);
}

function persist(list: HTMLUListElement, serviceSlug: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    rollback(list);
    return;
  }
  apiFetch(`endpoints/${serviceSlug}/examples/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify(names(list)),
  })
    .then((response) => {
      if (response.ok) {
        toast('success', 'Example order saved.');
        return;
      }
      if (response.status === 403) {
        clearApiKey();
        toast('error', 'Invalid API key.');
      } else {
        toast('error', 'Example order could not be saved.');
      }
      rollback(list);
    })
    .catch((err) => {
      console.error('Error while saving example order:', err);
      toast('error', 'Example order could not be saved.');
      rollback(list);
    });
}

/**
 * Makes the example list reorderable by dragging, using the native HTML5
 * drag-and-drop API. The list is reordered live during the drag; the new order
 * is sent to the API on drop and rolled back if that request fails.
 */
export function setupDragReorder(list: HTMLUListElement, getServiceSlug: () => string) {
  const keywordSearchInput = document.getElementById(
    'examplesKeywordSearchInput'
  )! as HTMLInputElement;

  list.addEventListener('dragstart', (event) => {
    const li = (event.target as HTMLElement).closest('li');
    if (!li) return;
    // Reordering a filtered view would only describe a subset of the examples,
    // so require the full list to be visible.
    if (keywordSearchInput.value.trim() !== '') {
      event.preventDefault();
      toast('error', 'Clear the search to reorder examples.');
      return;
    }
    dragged = li as HTMLLIElement;
    orderBeforeDrag = Array.from(list.children) as HTMLLIElement[];
    li.classList.add('dragging', ...DRAGGING_CLASSES);
    event.dataTransfer?.setData('text/plain', li.dataset.name ?? '');
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });

  // NOTE: the default dragover action rejects the drop, so it has to be
  // prevented for the `drop` event to fire at all.
  list.addEventListener('dragover', (event) => {
    if (!dragged) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const after = exampleAfter(list, event.clientY);
    if (after === null) {
      list.appendChild(dragged);
    } else if (after !== dragged.nextElementSibling) {
      list.insertBefore(dragged, after);
    }
  });

  list.addEventListener('drop', (event) => {
    if (dragged) event.preventDefault();
  });

  list.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('dragging', ...DRAGGING_CLASSES);
    dragged.draggable = false;
    const before = orderBeforeDrag.map((li) => li.dataset.name).join('\n');
    const changed = names(list).join('\n') !== before;
    dragged = null;
    if (changed) persist(list, getServiceSlug());
  });
}

/** Builds the grip that starts a drag. The example is only made draggable
 * while the grip is held, so that clicking a row still loads its query. */
export function createDragHandle(li: HTMLLIElement): HTMLSpanElement {
  const grip = document.createElement('span');
  grip.className =
    'shrink-0 cursor-grab select-none text-neutral-400 dark:text-neutral-600 active:cursor-grabbing';
  grip.innerText = '⠿';
  grip.title = 'Drag to reorder';
  grip.addEventListener('pointerdown', () => {
    li.draggable = true;
  });
  grip.addEventListener('pointerup', () => {
    li.draggable = false;
  });
  return grip;
}
