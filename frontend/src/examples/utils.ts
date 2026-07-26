import { closeDialog, openDialog, setupDialog } from '../dialogs';
import type { Editor } from '../editor/init';
import type { QlueLsServiceConfig } from '../types/backend';
import { loadExamples } from './init';

export function handleClickEvents() {
  const examplesButton = document.getElementById('examplesButton')!;
  examplesButton.addEventListener('click', () => {
    openExamples();
  });

  // NOTE: the close event also covers Escape and backdrop clicks
  setupDialog('examplesModal', () => {
    document.dispatchEvent(new Event('examples-closed'));
  });
}

export async function reloadExample(editor: Editor) {
  const service = (await editor.languageClient.sendRequest(
    'qlueLs/getBackend',
    {}
  )) as QlueLsServiceConfig;
  clearExamples();
  loadExamples(editor, service.name);
}

export function clearExamples() {
  const examplesList = document.getElementById('examplesList')!;
  examplesList.replaceChildren();
}

export function openExamples() {
  const input = document.getElementById('examplesKeywordSearchInput')! as HTMLInputElement;
  openDialog('examplesModal');
  // NOTE: Use timeout to ensure focus happens after command prompt cleanup
  setTimeout(() => {
    input.focus();
    input.value = '';
  }, 100);
}

export function closeExamples() {
  closeDialog('examplesModal');
}
