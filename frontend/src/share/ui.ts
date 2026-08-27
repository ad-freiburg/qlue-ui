import { closeDialog, openDialog } from '../dialogs';
import type { Editor } from '../editor/init';
import { buildShareResult } from './result';
import { FORMAT_LABEL, type ShareMode, type ShareOptions } from './types';

const appLinkButton = document.getElementById('shareAppLinkSelectButton')! as HTMLButtonElement;
const rawButton = document.getElementById('shareRawSelectButton')! as HTMLButtonElement;
const curlButton = document.getElementById('shareCurlSelectButton')! as HTMLButtonElement;
const plainQueryButton = document.getElementById(
  'sharePlainQuerySelectButton'
)! as HTMLButtonElement;
const shortLinkButton = document.getElementById('shareOptionShortLink')! as HTMLButtonElement;
const fullQueryButton = document.getElementById('shareOptionFullQuery')! as HTMLButtonElement;

const appLinkOptions = document.getElementById('appLinkOptions')! as HTMLElement;
const rawOptions = document.getElementById('rawOptions')! as HTMLElement;
const curlOptions = document.getElementById('curlOptions')! as HTMLElement;
const plainQueryOptions = document.getElementById('plainQueryOptions')! as HTMLElement;
const getButton = document.getElementById('shareOptionGETButton')! as HTMLButtonElement;
const postButton = document.getElementById('shareOptionPOSTButton')! as HTMLButtonElement;
const resultElement = document.getElementById('shareResult')! as HTMLElement;
const resultLabel = document.getElementById('shareResultLabel')! as HTMLElement;
const runSwitch = document.getElementById('shareOptionRun')! as HTMLInputElement;

export function openShare() {
  openDialog('shareModal');
}

export function closeShare() {
  closeDialog('shareModal');
}

/** Marks `active` as selected within a set of controls that share a group. */
function select(elements: HTMLElement[], active: HTMLElement) {
  for (const element of elements) {
    element.dataset.state = element === active ? 'active' : 'inactive';
  }
}

export function syncUI(options: ShareOptions, editor: Editor) {
  const modeButtons: Record<ShareMode, HTMLElement> = {
    'app-link': appLinkButton,
    'raw-api-request': rawButton,
    'curl-command': curlButton,
    'plain-query': plainQueryButton,
  };
  const modePanels: Record<ShareMode, HTMLElement> = {
    'app-link': appLinkOptions,
    'raw-api-request': rawOptions,
    'curl-command': curlOptions,
    'plain-query': plainQueryOptions,
  };

  select(Object.values(modeButtons), modeButtons[options.mode]);
  // NOTE: `invisible` rather than `hidden` — the panels share one grid cell, so
  // keeping them laid out is what stops the dialog resizing between modes.
  for (const [mode, panel] of Object.entries(modePanels)) {
    panel.classList.toggle('invisible', mode !== options.mode);
  }

  switch (options.mode) {
    case 'app-link':
      select(
        [shortLinkButton, fullQueryButton],
        options.idType === 'short' ? shortLinkButton : fullQueryButton
      );
      runSwitch.checked = options.runAutomatically;
      break;
    case 'curl-command':
      select([getButton, postButton], options.method === 'GET' ? getButton : postButton);
      break;
  }

  resultLabel.textContent = describe(options);
  updateResult(options, editor);
}

/** Names the currently selected target, shown next to the result. */
function describe(options: ShareOptions): string {
  switch (options.mode) {
    case 'app-link':
      return options.idType === 'short' ? 'App link · Short' : 'App link · Full query';
    case 'raw-api-request':
      return `API request · ${FORMAT_LABEL[options.outputFormat]}`;
    case 'curl-command':
      return `cURL · ${options.method} · ${FORMAT_LABEL[options.outputFormat]}`;
    case 'plain-query':
      return 'Plain query';
  }
}

async function updateResult(options: ShareOptions, editor: Editor) {
  const shareResult = await buildShareResult(options, editor);

  if (shareResult.ok) {
    resultElement.textContent = shareResult.value;
    resultElement.classList.remove('text-red-600', 'dark:text-red-400');
  } else {
    resultElement.textContent = shareResult.error;
    resultElement.classList.add('text-red-600', 'dark:text-red-400');
  }
}
