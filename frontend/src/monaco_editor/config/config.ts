// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

// Import Monaco Language Client components
import {
  configureDefaultWorkerFactory,
  useWorkerFactory,
  type WorkerLoader,
} from 'monaco-languageclient/workerFactory';
import { type EditorAppConfig } from 'monaco-languageclient/editorApp';
import { type MonacoVscodeApiConfig } from 'monaco-languageclient/vscodeApiWrapper';
import { type LanguageClientConfig } from 'monaco-languageclient/lcwrapper';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TextMateWorker from '@codingame/monaco-vscode-textmate-service-override/worker?worker';
// Import language server
import languageServerWorker from './languageServer.worker?worker';
// Import SPARQL config
import sparqlTextmateGrammar from './sparql.tmLanguage.json?raw';
import sparqlLanguageConfig from './sparql.configuration.json?raw';
import sparqlTheme from './sparql.theme.json?raw';
import { Uri } from 'monaco-editor';
import { LogLevel } from 'vscode';

export async function buildWrapperConfig(container: HTMLElement, initial: string) {
  const workerPromise: Promise<Worker> = new Promise((resolve) => {
    const instance: Worker = new languageServerWorker({ name: 'Language Server' });
    instance.onmessage = (event) => {
      if (event.data.type === 'ready') {
        resolve(instance);
      }
    };
  });
  const worker = await workerPromise;
  const workerLoaders: Partial<Record<string, WorkerLoader>> = {
    TextEditorWorker: () => new editorWorker(),
    TextMateWorker: () => new TextMateWorker(),
  };
  const extensionFilesOrContents = new Map<string, string | URL>();
  extensionFilesOrContents.set('/sparql-configuration.json', sparqlLanguageConfig);
  extensionFilesOrContents.set('/sparql-grammar.json', sparqlTextmateGrammar);
  extensionFilesOrContents.set('/sparql-theme.json', sparqlTheme);

  // Monaco VSCode API configuration
  const vscodeApiConfig: MonacoVscodeApiConfig = {
    $type: 'extended',
    viewsConfig: {
      $type: 'EditorService',
    },
    logLevel: LogLevel.Debug,
    userConfiguration: {
      json: JSON.stringify({
        'workbench.colorTheme': 'QleverUiTheme',
        'editor.guides.bracketPairsHorizontal': 'active',
        'editor.lightbulb.enabled': 'On',
        'editor.wordBasedSuggestions': 'off',
        'editor.experimental.asyncTokenization': true,
        'editor.tabSize': 2,
        'editor.insertSpaces': true,
        'editor.detectIndentation': false,
        'files.eol': '\n',
      }),
    },
    monacoWorkerFactory: (logger) => {
      useWorkerFactory({ workerLoaders });
    },
    extensions: [
      {
        config: {
          name: 'langium-sparql',
          publisher: 'Ioannis Nezis',
          version: '1.0.0',
          engines: {
            vscode: '*',
          },
          contributes: {
            languages: [
              {
                id: 'sparql',
                extensions: ['.rq'],
                aliases: ['sparql', 'SPARQL'],
                configuration: '/sparql-configuration.json',
              },
            ],
            themes: [
              {
                id: 'QleverUiTheme',
                label: 'Qlever-UI Custom Theme',
                uiTheme: 'vs',
                path: './sparql-theme.json',
              },
            ],
            grammars: [
              {
                language: 'sparql',
                scopeName: 'source.sparql',
                path: '/sparql-grammar.json',
              },
            ],
          },
        },
        filesOrContents: extensionFilesOrContents,
      },
    ],
  };

  // Language client configuration
  const languageClientConfig: LanguageClientConfig = {
    languageId: 'sparql',
    clientOptions: {
      documentSelector: [{ language: 'sparql' }],
      workspaceFolder: {
        index: 0,
        name: 'workspace',
        uri: Uri.parse('file:/'),
      },
      progressOnInitialization: true,
      diagnosticPullOptions: {
        onChange: true,
        onSave: false,
      },
    },
    connection: {
      options: {
        $type: 'WorkerDirect',
        worker: worker,
      },
    },
    restartOptions: {
      retries: 5,
      timeout: 1000,
      keepWorker: true,
    },
  };

  // editor app / monaco-editor configuration
  const editorAppConfig: EditorAppConfig = {
    codeResources: {
      modified: {
        uri: 'query.rq',
        text: initial,
      },
    },
    editorOptions: {
      tabCompletion: 'on',
      suggestOnTriggerCharacters: true,
      fontSize: 14,
      fontFamily: 'Source Code Pro',
      links: false,
      minimap: {
        enabled: false,
      },
      overviewRulerLanes: 0,
      scrollBeyondLastLine: false,
      padding: {
        top: 8,
        bottom: 8,
      },
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 2,
      glyphMargin: true,
      contextmenu: false,
      folding: true,
      foldingImportsByDefault: true,
    },
  };

  return {
    vscodeApiConfig: vscodeApiConfig,
    languageClientConfig: languageClientConfig,
    editorAppConfig: editorAppConfig,
  };
}
