import { settings, setUiToken } from './settings/init';
import { BASE_PATH } from './utils';

/** The API key is the "QLever UI token" setting; prompt for it if unset. */
export function getApiKey(): string | null {
  if (settings.general.uiToken) return settings.general.uiToken;
  const key = prompt('Enter API key:');
  if (key) setUiToken(key);
  return key;
}

export function clearApiKey(): void {
  setUiToken('');
}

/** Fetches from the UI API, prefixing the path with the base URL. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}ui-api/${path}`, init);
}
