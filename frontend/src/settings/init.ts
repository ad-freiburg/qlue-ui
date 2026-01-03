import type { Editor } from "../editor/init";

export function setupSettings(editor: Editor) {
  const settingsButton = document.getElementById("settingsButton")!;
  const settingsModal = document.getElementById("settingsModal")!;
  const settingsContainer = document.getElementById("settingsContainer")!;
  console.log(editor);

  settingsModal.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  settingsButton.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  settingsContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}
