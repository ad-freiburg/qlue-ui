import { closeDialog, openDialog, setupDialog } from '../dialogs';

export function handleClickEvents() {
  setupDialog('commandPromptModal');
}

export function openCommandPrompt() {
  clearCommandPrompt();
  openDialog('commandPromptModal');
  const commandPrompt = document.getElementById('commandPrompt')! as HTMLInputElement;
  commandPrompt.focus();
}

export function closeCommandPrompt() {
  closeDialog('commandPromptModal');
}

function clearCommandPrompt() {
  const commandPrompt = document.getElementById('commandPrompt')! as HTMLInputElement;
  commandPrompt.value = '';
}
