import { closeExamples } from "./examples/utils"
import { closeHelp, openHelp } from "./buttons/help"
import { closeSettings, openSettings } from "./settings/utils"
import { closeShare } from "./share"
import { closeDatasetInformation } from "./buttons/dataset_information"

type Shortcut = {
  ctrl?: boolean      // true if Ctrl must be pressed
  meta?: boolean      // true if ⌘ must be pressed
  shift?: boolean     // true if Shift must be pressed
  alt?: boolean       // true if Alt must be pressed
  key: string         // The key to listen for, e.g., ',' or '?'
}

type ShortcutHandler = (event: KeyboardEvent) => void

// NOTE: This functions sets the keybindings for the UI.
// Keep in mind that these keybindings only apply if the focus is NOT on the editor.
// When changing a keybing one must change these keybindings here, but also in the editor.
export function setupKeybindings() {
  registerShortcut({ shift: true, key: "?" }, () => { closeAllModals(); openHelp(); });
  registerShortcut({ ctrl: true, key: "," }, () => { closeAllModals(); openSettings(); });
  registerShortcut({ ctrl: true, key: "Enter" }, () => { closeAllModals(); openSettings(); });
  registerShortcut({ key: "Escape" }, () => closeAllModals());
}


function registerShortcut(shortcut: Shortcut, handler: ShortcutHandler) {
  document.addEventListener("keydown", (event) => {
    console.log(event.key);

    const target = event.target as HTMLElement
    // NOTE: Ignore when user is tying in inputs
    if (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA") return

    const modifierMatch =
      (shortcut.ctrl ?? false) === event.ctrlKey &&
      (shortcut.meta ?? false) === event.metaKey &&
      (shortcut.shift ?? false) === event.shiftKey &&
      (shortcut.alt ?? false) === event.altKey;

    if (modifierMatch && event.key === shortcut.key) {
      event.preventDefault();
      handler(event);
    }
  })
}

function closeAllModals() {
  closeHelp();
  closeSettings();
  closeExamples();
  closeShare();
  closeDatasetInformation();
}
