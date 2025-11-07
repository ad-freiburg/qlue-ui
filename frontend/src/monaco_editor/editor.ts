// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import './style.css';
import { buildWrapperConfig } from './config/config';
import { setup_key_bindings } from './keys';
import { setup_commands } from './commands';
import { setup_settings } from './settings';
import { MonacoVscodeApiWrapper } from 'monaco-languageclient/vscodeApiWrapper';
import { LanguageClientWrapper } from 'monaco-languageclient/lcwrapper';
import { EditorApp } from 'monaco-languageclient/editorApp';
import { MonacoLanguageClient } from 'monaco-languageclient';
import * as monaco from 'monaco-editor';
import { executeQueryAndShowResults } from '../results';

interface EditorAndLanguageClient {
  editorApp: EditorApp;
  languageClient: MonacoLanguageClient;
}

export async function init(container_id: string): Promise<EditorAndLanguageClient> {
  const editorContainer = document.getElementById(container_id);
  if (editorContainer) {
    const configs = await buildWrapperConfig(
      editorContainer,
      `PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX osmrel: <https://www.openstreetmap.org/relation/>
SELECT * WHERE {
  osmrel:102740 geo:hasGeometry /geo:asWKT ?geometry 
}`
    );
    // NOTE: Create the monaco-vscode api Wrapper and start it before anything else.
    const apiWrapper = new MonacoVscodeApiWrapper(configs.vscodeApiConfig);
    await apiWrapper.start();

    // NOTE: Create language client wrapper.
    const lcWrapper = new LanguageClientWrapper(configs.languageClientConfig);
    await lcWrapper.start();
    const languageClient = lcWrapper.getLanguageClient()!;

    // NOTE: Create and start the editor app.
    const editorApp = new EditorApp(configs.editorAppConfig);
    const htmlContainer = document.getElementById(container_id)!;
    await editorApp.start(htmlContainer);

    let editorAndLanguageClient: EditorAndLanguageClient = {
      editorApp: editorApp,
      languageClient: languageClient,
    };

    setup_key_bindings(editorAndLanguageClient);
    setup_commands(editorApp);
    setup_settings(editorApp, languageClient);
    setup_toggle_theme(editorApp);

    editorApp.updateLayout();
    editorApp.getEditor()!.focus();

    // NOTE: fill editor with value of search parameter `query`.
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (query) {
      editorApp.getEditor()!.setValue(decodeURIComponent(query));
    }


    return editorAndLanguageClient;
  } else {
    throw new Error(`No element with id: "${container_id}" found`);
  }
}

function setup_toggle_theme(editorApp: EditorApp) {
  // Check current theme & add event listener.
  const themeSwitch = document.getElementById('theme-switch')! as HTMLInputElement;
  const set_editor_theme = () => {
    if (themeSwitch.checked) {
      monaco.editor.setTheme('QleverUiThemeDark');
    } else {
      monaco.editor.setTheme('QleverUiThemeLight');
    }
  };
  set_editor_theme();
  themeSwitch.addEventListener('change', set_editor_theme);
}
