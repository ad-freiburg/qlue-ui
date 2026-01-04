export function handleClickEvents() {
  const settingsButton = document.getElementById("settingsButton")!;
  const settingsModal = document.getElementById("settingsModal")!;
  const settingsContainer = document.getElementById("settingsContainer")!;

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

