import type { Editor } from "../editor/init";
import type { UiMode } from "../types/settings";
import { handleClickEvents } from "./utils";

export let accessToken: string | null = null;
const accessTokenInput = document.getElementById("accessToken")! as HTMLInputElement;
export let uiMode: UiMode = "results";
const uiModeInput = document.getElementById("uiMode")! as HTMLSelectElement;


export function setupSettings(_editor: Editor) {
  handleClickEvents();
  loadFromLocalStorage();
  handleInput();
}

function handleInput() {
  // NOTE: Access Token
  accessTokenInput.addEventListener("input", () => {
    accessToken = accessTokenInput.value;
    localStorage.setItem('QLeverUI-accessToken', accessToken);
  });
  // NOTE: UI mode
  uiModeInput.addEventListener("change", () => {
    if (uiModeInput.value === "results" || uiModeInput.value === "compare") {
      uiMode = uiModeInput.value;
      localStorage.setItem('QLeverUI-uiMode', uiMode);
    }
  });
}

function loadFromLocalStorage() {
  accessToken = localStorage.getItem('QLeverUI-accessToken');
  accessTokenInput.value = accessToken ?? "";
  const uiModeStored = localStorage.getItem('QLeverUI-uiMode');
  if (uiModeStored === "results" || uiModeStored === "compare") {
    uiMode = uiModeStored;
    uiModeInput.value = uiMode;
  }
}
