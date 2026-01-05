import type { Editor } from "../editor/init";
import type { UiSettings } from "../types/settings";
import { getInputByPath, handleClickEvents, setByPath, walk } from "./utils";

export let settings: UiSettings = {
  general: {
    accessToken: "UdKTWNFUoLm9POa8m7a5jvhjVrq7tYqU",
    uiMode: "results"
  },
  editor: {
    format: {
      alignPrefixes: false,
      alignPredicates: true,
      capitalizeKeywords: true,
      filterSameLine: true,
      separatePrologue: false,
      whereNewLine: false,
      insertSpaces: true,
      tabSize: 2
    },
    completion: {
      timeoutMs: 5_000,
      resultSizeLimit: 101
    },
    prefixes: {
      addMissing: true,
      removeUnused: false,
    }
  }
}

export function setupSettings(_editor: Editor) {
  handleClickEvents();
  loadFromLocalStorage();
  updateDom();
  handleInput();
}

function updateDom() {
  walk(settings, (path, value) => {
    const input = getInputByPath(path);
    switch (typeof (value)) {
      case "boolean":
        input.checked = value;
        break;
      default:
        input.value = value;
        break;
    }
  }, []);
}

function handleInput() {
  walk(settings, (path, value) => {
    const input = getInputByPath(path);
    switch (typeof (value)) {
      case "boolean":
        input.addEventListener("input", () => {
          setByPath(settings, path, input.checked)
        });
        break;
      default:
        input.addEventListener("input", () => {
          setByPath(settings, path, input.value)
        });
        break;
    }
  }, []);
}

function loadFromLocalStorage() {
  const storedQlueLsSettings = localStorage.getItem('QLeverUI settings');
  if (storedQlueLsSettings) {
    settings = JSON.parse(storedQlueLsSettings);
  }
}
