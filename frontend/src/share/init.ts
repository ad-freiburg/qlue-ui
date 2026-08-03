import { apiFetch } from '../api';
import { setupDialog } from '../dialogs';
import type { Editor } from '../editor/init';
import type {
  AppLinkOptions,
  CurlCommandOptions,
  OutputFormat,
  RawApiRequestOptions,
  ShareOptions,
} from './types';
import { closeShare, openShare, syncUI } from './ui';

const appLinkOptions: AppLinkOptions = {
  mode: 'app-link',
  runAutomatically: true,
  idType: 'short',
};

const rawApiOptions: RawApiRequestOptions = {
  mode: 'raw-api-request',
  outputFormat: 'sparql_json',
};

const curlOptions: CurlCommandOptions = {
  mode: 'curl-command',
  outputFormat: 'sparql_json',
  method: 'POST',
};

let shareOptions: ShareOptions = appLinkOptions;

export async function setupShare(editor: Editor) {
  const shareButton = document.getElementById('shareButton')!;
  const shareCopyButton = document.getElementById('shareCopyButton')!;
  const appLinkButton = document.getElementById('shareAppLinkSelectButton')! as HTMLButtonElement;
  const rawButton = document.getElementById('shareRawSelectButton')! as HTMLButtonElement;
  const curlButton = document.getElementById('shareCurlSelectButton')! as HTMLButtonElement;
  const shortLinkButton = document.getElementById('shareOptionShortLink')! as HTMLButtonElement;
  const fullQueryButton = document.getElementById('shareOptionFullQuery')! as HTMLButtonElement;
  const runSwitch = document.getElementById('shareOptionRun')! as HTMLInputElement;
  const getButton = document.getElementById('shareOptionGETButton')! as HTMLButtonElement;
  const postButton = document.getElementById('shareOptionPOSTButton')! as HTMLButtonElement;
  const rawFormatSelect = document.getElementById('shareRawFormatSelect')! as HTMLSelectElement;
  const curlFormatSelect = document.getElementById('shareCurlFormatSelect')! as HTMLSelectElement;
  const resultElement = document.getElementById('shareResult')! as HTMLElement;
  const closeButton = document.getElementById('shareClose')! as HTMLButtonElement;

  rawFormatSelect.value = rawApiOptions.outputFormat;
  curlFormatSelect.value = curlOptions.outputFormat;

  shareButton.addEventListener('click', async () => {
    const query = editor.getContent();

    if (query.trim() === '') {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'warning',
            message: 'There is nothing to share.',
            duration: 3000,
          },
        })
      );
      return;
    }
    syncUI(shareOptions, editor);
    openShare();
  });
  setupDialog('shareModal');

  shareCopyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(resultElement.textContent!.trim());
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          type: 'success',
          message: 'Copied to clipboard',
          duration: 2000,
        },
      })
    );
  });

  appLinkButton.addEventListener('click', () => {
    shareOptions = appLinkOptions;
    syncUI(shareOptions, editor);
  });
  rawButton.addEventListener('click', () => {
    shareOptions = rawApiOptions;
    syncUI(shareOptions, editor);
  });
  curlButton.addEventListener('click', () => {
    shareOptions = curlOptions;
    syncUI(shareOptions, editor);
  });
  shortLinkButton.addEventListener('click', () => {
    appLinkOptions.idType = 'short';
    syncUI(shareOptions, editor);
  });
  fullQueryButton.addEventListener('click', () => {
    appLinkOptions.idType = 'full-query';
    syncUI(shareOptions, editor);
  });
  getButton.addEventListener('click', () => {
    curlOptions.method = 'GET';
    syncUI(shareOptions, editor);
  });
  postButton.addEventListener('click', () => {
    curlOptions.method = 'POST';
    syncUI(shareOptions, editor);
  });
  runSwitch.addEventListener('input', () => {
    appLinkOptions.runAutomatically = runSwitch.checked;
    syncUI(shareOptions, editor);
  });
  rawFormatSelect.addEventListener('input', () => {
    rawApiOptions.outputFormat = rawFormatSelect.value as OutputFormat;
    syncUI(shareOptions, editor);
  });
  curlFormatSelect.addEventListener('input', () => {
    curlOptions.outputFormat = curlFormatSelect.value as OutputFormat;
    syncUI(shareOptions, editor);
  });
  closeButton.addEventListener('click', () => {
    closeShare();
  });
}

/** Posts the query to the share API and returns the generated short ID. */
export async function getShareLinkId(query: string): Promise<string> {
  const response = await apiFetch('shared-query/', {
    method: 'POST',
    body: query,
  });

  if (!response.ok) {
    if (response.status === 413) {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'warning',
            message: 'Query is too large to share via short link.',
            duration: 4000,
          },
        })
      );
      throw new Error('Query too large');
    }
    throw new Error('Could not acquire share link');
  }

  const json = await response.json();
  return json.id;
}

/** Fetches the saved query text for the given short ID from the share API. */
export async function getSharedQuery(id: string): Promise<string> {
  return await apiFetch(`shared-query/${id}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not get query with ID "${id}".`);
      }
      return response.json();
    })
    .then((json) => json.query)
    .catch(() => {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'error',
            message: `Failed to load query with ID: "${id}"`,
            duration: 2000,
          },
        })
      );
    });
}
