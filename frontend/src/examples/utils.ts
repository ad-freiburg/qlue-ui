import type { Editor } from "../editor/init";
import type { Service } from "../types/backend";
import { loadExamples } from "./init";

export function handleClickEvents() {
  const examplesButton = document.getElementById('examplesButton')!;
  const examplesModal = document.getElementById('examplesModal')!;
  const examplesSearch = document.getElementById('examplesSearch')!;
  examplesButton.addEventListener('click', () => {
    openExamples();
  });

  examplesModal.addEventListener('click', () => {
    closeExamples();
  });

  examplesSearch.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

export async function reloadExample(editor: Editor) {
  const service = await editor.languageClient.sendRequest("qlueLs/getBackend", {}) as Service;
  clearExamples();
  loadExamples(editor, service.name);
}

export function clearExamples() {
  const examplesList = document.getElementById('examplesList')!;
  examplesList.replaceChildren();
}

export function openExamples() {
  const input = document.getElementById('examplesKeywordSearchInput')! as HTMLInputElement;
  const examplesModal = document.getElementById('examplesModal')!;
  examplesModal.classList.remove('hidden');
  input.focus();
  input.value = '';
}

export function closeExamples() {
  const examplesModal = document.getElementById('examplesModal')!;
  examplesModal.classList.add('hidden');
  document.dispatchEvent(new Event('examples-closed'));
}
