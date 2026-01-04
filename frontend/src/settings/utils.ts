export function handleClickEvents() {
  const settingsButton = document.getElementById("settingsButton")!;
  const settingsModal = document.getElementById("settingsModal")!;
  const settingsContainer = document.getElementById("settingsContainer")!;

  settingsModal.addEventListener('click', () => {
    closeSettings();
  });

  settingsButton.addEventListener('click', () => {
    openSettings();
  });

  settingsContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

export function openSettings() {
  const settingsModal = document.getElementById("settingsModal")!;
  settingsModal.classList.remove('hidden');
}

export function closeSettings() {
  const settingsModal = document.getElementById("settingsModal")!;
  settingsModal.classList.add('hidden');
}
