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
  },
  results: {
    typeAnnotations: true,
    langAnnotations: true,
    loadImages: true
  }
}

export function setupSettings(editor: Editor) {
  handleClickEvents();
  handleInput(editor);
  loadFromLocalStorage();
  updateLanguageServer(editor);
  updateDom();
}

function updateLanguageServer(editor: Editor) {
  editor.languageClient.sendNotification("qlueLs/changeSettings", settings.editor)
    .catch((err) => {
      console.error('Error during changeSettings: ', err);
    });
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

function handleInput(editor: Editor) {
  const stringFields = ["accessToken", "uiMode"];
  walk(settings, (path, value) => {
    const input = getInputByPath(path);
    switch (typeof (value)) {
      case "boolean":
        input.addEventListener("input", () => {
          setByPath(settings, path, input.checked);
          saveToLocalStorage();
          if (path[0] === "editor") updateLanguageServer(editor);
        });
        break;
      default:
        input.addEventListener("input", () => {
          if (input.value != "") {
            setByPath(settings, path, stringFields.includes(path[path.length - 1]) ? input.value : parseInt(input.value));
            saveToLocalStorage();
            if (path[0] === "editor") updateLanguageServer(editor);
          }
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

function saveToLocalStorage() {
  localStorage.setItem("QLeverUI settings", JSON.stringify(settings));
}
