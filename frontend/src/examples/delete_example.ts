import { apiFetch, clearApiKey, getApiKey } from '../api';
import { settings } from '../settings/init';

function toast(type: 'success' | 'error', message: string) {
  document.dispatchEvent(
    new CustomEvent('toast', {
      detail: { type, message, duration: 3000 },
    })
  );
}

/** Deleting is a privileged operation; only offer it once a token is stored.
 * We deliberately do not prompt for one just to render the delete buttons. */
export function canDelete(): boolean {
  return settings.general.uiToken !== '';
}

/** Builds the button that deletes an example. The row is removed from the list
 * once the API confirms the deletion. */
export function createDeleteButton(li: HTMLLIElement, serviceSlug: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className =
    'ml-auto shrink-0 cursor-pointer text-neutral-400 hover:text-red-600 dark:text-neutral-600 dark:hover:text-red-500';
  button.innerText = '✕';
  button.title = 'Delete example';
  button.addEventListener('click', (event) => {
    // NOTE: without this the row's own click handler would also fire and load
    // the query of the example we are about to delete into the editor.
    event.stopPropagation();
    const name = li.dataset.name ?? '';
    if (!confirm(`Delete example "${name}"?`)) return;
    const apiKey = getApiKey();
    if (!apiKey) return;
    apiFetch(`endpoints/${serviceSlug}/examples/`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ name }),
    })
      .then((response) => {
        if (response.ok) {
          li.remove();
          toast('success', `Example "${name}" deleted.`);
        } else if (response.status === 403) {
          clearApiKey();
          toast('error', 'Invalid API key.');
        } else {
          toast('error', `Example "${name}" could not be deleted.`);
        }
      })
      .catch((err) => {
        console.error('Error while deleting example:', err);
        toast('error', `Example "${name}" could not be deleted.`);
      });
  });
  return button;
}
