import type { Editor } from '../editor/init';
import { buildShareResult } from './result';
import type { ShareOptions } from './types';

const appLinkButton = document.getElementById('shareAppLinkSelectButton')! as HTMLButtonElement;
const rawButton = document.getElementById('shareRawSelectButton')! as HTMLButtonElement;
const curlButton = document.getElementById('shareCurlSelectButton')! as HTMLButtonElement;
const shortLinkButton = document.getElementById('shareOptionShortLink')! as HTMLButtonElement;
const fullQueryButton = document.getElementById('shareOptionFullQuery')! as HTMLButtonElement;

const appLinkOptions = document.getElementById('appLinkOptions')! as HTMLButtonElement;
const rawOptions = document.getElementById('rawOptions')! as HTMLButtonElement;
const curlOptions = document.getElementById('curlOptions')! as HTMLButtonElement;
const getButton = document.getElementById('shareOptionGETButton')! as HTMLButtonElement;
const postButton = document.getElementById('shareOptionPOSTButton')! as HTMLButtonElement;
const resultElement = document.getElementById('shareResult')! as HTMLElement;
const runSwitch = document.getElementById('shareOptionRun')! as HTMLInputElement;

export function openShare() {
  const shareModal = document.getElementById('shareModal')!;
  shareModal.classList.remove('hidden');
}

export function closeShare() {
  const shareModal = document.getElementById('shareModal')!;
  shareModal.classList.add('hidden');
}

export function syncUI(options: ShareOptions, editor: Editor) {
  switch (options.mode) {
    case 'app-link':
      appLinkButton.classList.remove(
        'border-transparent',
        'text-neutral-500',
        'dark:text-neutral-400'
      );
      appLinkButton.classList.add(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      appLinkOptions.style.removeProperty('display');
      rawButton.classList.add('border-transparent', 'text-neutral-500', 'dark:text-neutral-400');
      rawButton.classList.remove(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      rawOptions.style.setProperty('display', 'none');
      curlButton.classList.add('border-transparent', 'text-neutral-500', 'dark:text-neutral-400');
      curlButton.classList.remove(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      curlOptions.style.setProperty('display', 'none');
      switch (options.idType) {
        case 'short':
          shortLinkButton.classList.remove('text-neutral-500', 'dark:text-neutral-400');
          shortLinkButton.classList.add(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          fullQueryButton.classList.remove(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          fullQueryButton.classList.add('text-neutral-500', 'dark:text-neutral-400');
          break;
        case 'full-query':
          fullQueryButton.classList.remove('text-neutral-500', 'dark:text-neutral-400');
          fullQueryButton.classList.add(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          shortLinkButton.classList.remove(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          shortLinkButton.classList.add('text-neutral-500', 'dark:text-neutral-400');
          break;
      }
      runSwitch.checked = options.runAutomatically;
      break;

    case 'raw-api-request':
      rawButton.classList.remove('border-transparent', 'text-neutral-500', 'dark:text-neutral-400');
      rawButton.classList.add(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      rawOptions.style.removeProperty('display');
      appLinkButton.classList.add(
        'border-transparent',
        'text-neutral-500',
        'dark:text-neutral-400'
      );
      appLinkButton.classList.remove(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      appLinkOptions.style.setProperty('display', 'none');
      curlButton.classList.add('border-transparent', 'text-neutral-500', 'dark:text-neutral-400');
      curlButton.classList.remove(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      curlOptions.style.setProperty('display', 'none');
      break;
    case 'curl-command':
      curlButton.classList.remove(
        'border-transparent',
        'text-neutral-500',
        'dark:text-neutral-400'
      );
      curlButton.classList.add(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      curlOptions.style.removeProperty('display');
      rawButton.classList.add('border-transparent', 'text-neutral-500', 'dark:text-neutral-400');
      rawButton.classList.remove(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      rawOptions.style.setProperty('display', 'none');
      appLinkButton.classList.add(
        'border-transparent',
        'text-neutral-500',
        'dark:text-neutral-400'
      );
      appLinkButton.classList.remove(
        'bg-neutral-100',
        'dark:bg-neutral-800',
        'border-neutral-900',
        'dark:border-neutral-100',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
      appLinkOptions.style.setProperty('display', 'none');
      switch (options.method) {
        case 'GET':
          getButton.classList.remove('text-neutral-500', 'dark:text-neutral-400');
          getButton.classList.add(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          postButton.classList.remove(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          postButton.classList.add('text-neutral-500', 'dark:text-neutral-400');
          break;
        case 'POST':
          postButton.classList.remove('text-neutral-500', 'dark:text-neutral-400');
          postButton.classList.add(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          getButton.classList.remove(
            'bg-white',
            'dark:bg-neutral-700',
            'text-neutral-900',
            'dark:text-neutral-100',
            'shadow-sm'
          );
          getButton.classList.add('text-neutral-500', 'dark:text-neutral-400');
          break;
      }

      break;
  }
  updateResult(options, editor);
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
