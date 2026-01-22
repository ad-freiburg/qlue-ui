import type { Editor } from '../editor/init';
import type { UiSettings } from '../types/settings';
import { getInputByPath, handleClickEvents, setByPath, walk } from './utils';

export let settings: UiSettings = {
  general: {
    accessToken: 'UdKTWNFUoLm9POa8m7a5jvhjVrq7tYqU',
    uiMode: 'results',
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
      tabSize: 2,
    },
    completion: {
      timeoutMs: 5_000,
      resultSizeLimit: 101,
      subjectCompletionTriggerLength: 3,
      objectCompletionSuffix: true
    },
    prefixes: {
      addMissing: true,
      removeUnused: false,
    },
    jumpWithTab: false,
  },
  results: {
    typeAnnotations: true,
    langAnnotations: true,
    loadImages: true,
    shortenIris: true,
    limit: 100
  },
};

export function setupSettings(editor: Editor) {
  handleClickEvents();
  handleInput(editor);
  loadFromLocalStorage();
  updateDom();
  updateLanguageServer(editor);
}

function updateLanguageServer(editor: Editor) {
  editor.languageClient.sendNotification('qlueLs/changeSettings', settings.editor).catch((err) => {
    console.error('Error during changeSettings: ', err);
  });
}

function updateDom() {
  walk(
    settings,
    (path, value) => {
      const input = getInputByPath(path);
      switch (typeof value) {
        case 'boolean':
          input.checked = value;
          break;
        default:
          input.value = value;
          break;
      }
    },
    []
  );
}

function handleInput(editor: Editor) {
  const stringFields = ['accessToken', 'uiMode'];
  walk(
    settings,
    (path, value) => {
      const input = getInputByPath(path);
      switch (typeof value) {
        case 'boolean':
          input.addEventListener('input', () => {
            setByPath(settings, path, input.checked);
            saveToLocalStorage();
            if (path[0] === 'editor') updateLanguageServer(editor);
            if (path[0] === 'results') updateResultsDisplay();
          });
          break;
        default:
          input.addEventListener('input', () => {
            if (input.value != '') {
              setByPath(
                settings,
                path,
                stringFields.includes(path[path.length - 1]) ? input.value : parseInt(input.value)
              );
              saveToLocalStorage();
              if (path[0] === 'editor') updateLanguageServer(editor);
              if (path[0] === 'results') updateResultsDisplay();
            }
          });
          break;
      }
    },
    []
  );
}

function updateResultsDisplay() {
  document.querySelectorAll('.type-tag').forEach((el) => {
    el.classList.toggle('hidden', !settings.results.typeAnnotations);
  });
  document.querySelectorAll('.lang-tag').forEach((el) => {
    el.classList.toggle('hidden', !settings.results.langAnnotations);
  });
  document.querySelectorAll('.iri-short').forEach((el) => {
    el.classList.toggle('hidden', !settings.results.shortenIris);
  });
  document.querySelectorAll('.iri-full').forEach((el) => {
    el.classList.toggle('hidden', settings.results.shortenIris);
  });
}

function loadFromLocalStorage() {
  const storedQlueLsSettings = localStorage.getItem('QLeverUI settings');
  if (storedQlueLsSettings) {
    const newSettings = JSON.parse(storedQlueLsSettings);
    walk(newSettings, (path, value) => {
      setByPath(settings, path, value);
    });
  }
}

function saveToLocalStorage() {
  localStorage.setItem('QLeverUI settings', JSON.stringify(settings));
}
