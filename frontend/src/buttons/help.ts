import { closeDialog, openDialog, setupDialog } from '../dialogs';

export function setupHelp() {
  const helpButton = document.getElementById('helpButton')!;
  const helpContainer = document.getElementById('helpContainer')!;

  setupDialog('helpModal');

  helpButton.addEventListener('click', () => {
    openHelp();
  });

  document.getElementById('helpClose')!.addEventListener('click', () => {
    closeHelp();
  });

  if (detectOS() === 'mac') {
    helpContainer.querySelectorAll('.modkey').forEach((kbd) => {
      kbd.textContent = '⌘';
    });
  }
}

export function openHelp() {
  openDialog('helpModal');
}

export function closeHelp() {
  closeDialog('helpModal');
}

function detectOS() {
  // Fallback
  return navigator.platform.toLowerCase().includes('mac')
    ? 'mac'
    : navigator.platform.toLowerCase().includes('win')
      ? 'windows'
      : navigator.platform.toLowerCase().includes('linux')
        ? 'linux'
        : 'unknown';
}
