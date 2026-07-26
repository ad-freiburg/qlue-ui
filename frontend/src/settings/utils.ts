import { closeDialog, openDialog, setupDialog } from '../dialogs';

export function handleClickEvents() {
  const settingsButton = document.getElementById('settingsButton')!;

  setupDialog('settingsModal');

  settingsButton.addEventListener('click', () => {
    openSettings();
  });
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
