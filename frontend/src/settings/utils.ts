import { closeDialog, openDialog, setupDialog } from '../dialogs';

export function handleClickEvents() {
  const settingsButton = document.getElementById('settingsButton')!;

  setupDialog('settingsModal');

  settingsButton.addEventListener('click', () => {
    openSettings();
  });

  document.getElementById('settingsClose')!.addEventListener('click', () => {
    closeSettings();
  });

  handleTabEvents();
  handlePasswordToggles();
}

/**
 * Wires the eye buttons next to token inputs: each toggles the input's masking
 * and swaps the show/hide icon.
 */
function handlePasswordToggles() {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-password-toggle]')) {
    const input = button.parentElement!.querySelector<HTMLInputElement>('input')!;
    button.addEventListener('click', () => {
      const reveal = input.classList.contains('text-masked');
      input.classList.toggle('text-masked', !reveal);
      button.title = reveal ? 'Hide token' : 'Show token in clear text';
      button.querySelector('[data-password-icon="show"]')!.classList.toggle('hidden', reveal);
      button.querySelector('[data-password-icon="hide"]')!.classList.toggle('hidden', !reveal);
    });
  }
}

/**
 * Wires the settings rail: every button carries `data-settings-tab` holding the
 * id of the panel it reveals.
 */
function handleTabEvents() {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-settings-tab]')];

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      for (const other of tabs) {
        const active = other === tab;
        other.dataset.state = active ? 'active' : 'inactive';
        document.getElementById(other.dataset.settingsTab!)!.classList.toggle('hidden', !active);
      }
    });
  }
}

export function openSettings() {
  openDialog('settingsModal');
  // NOTE: remove focus from monaco editor
  document.getElementById('settings-general-accessToken')!.focus();
  document.getElementById('settings-general-accessToken')!.blur();
}

export function closeSettings() {
  closeDialog('settingsModal');
}

export function walk(
  obj: unknown,
  fn: (path: string[], value: unknown) => void,
  path: string[] = []
) {
  if (typeof obj !== 'object' || obj === null) return fn(path, obj);
  for (const [k, v] of Object.entries(obj)) walk(v, fn, [...path, k]);
}

export function getInputByPath(path: string[]): HTMLInputElement {
  return document.getElementById(['settings', ...path].join('-'))! as HTMLInputElement;
}

export function hasPath(obj: object, path: string[]): boolean {
  let current: unknown = obj;
  for (const key of path) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return true;
}

export function setByPath(obj: object, path: string[], value: unknown) {
  let current = obj as Record<string, unknown>;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}
