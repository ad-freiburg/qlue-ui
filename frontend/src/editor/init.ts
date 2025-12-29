// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import './style.css';
import { buildWrapperConfig } from './config/config';
import { setup_key_bindings } from './keys';
import { setup_commands } from './commands';
import { MonacoVscodeApiWrapper } from 'monaco-languageclient/vscodeApiWrapper';
import { LanguageClientWrapper } from 'monaco-languageclient/lcwrapper';
import { EditorApp } from 'monaco-languageclient/editorApp';
import { MonacoLanguageClient } from 'monaco-languageclient';
import * as monaco from 'monaco-editor';

interface EditorAndLanguageClient {
  editorApp: EditorApp;
  languageClient: MonacoLanguageClient;
}

export async function setupEditor(container_id: string): Promise<EditorAndLanguageClient> {
  const editorContainer = document.getElementById(container_id);
  if (editorContainer) {
    const configs = await buildWrapperConfig(``);
    // NOTE: Create the monaco-vscode api Wrapper and start it before anything else.
    const apiWrapper = new MonacoVscodeApiWrapper(configs.vscodeApiConfig);
    await apiWrapper.start();

    // NOTE: Create language client wrapper.
    const lcWrapper = new LanguageClientWrapper(configs.languageClientConfig);
    await lcWrapper.start();
    const languageClient = lcWrapper.getLanguageClient()!;

    // NOTE: Create and start the editor app.
    const editorApp = new EditorApp(configs.editorAppConfig);
    await editorApp.start(editorContainer);

    let editorAndLanguageClient: EditorAndLanguageClient = {
      editorApp: editorApp,
      languageClient: languageClient,
    };

    setup_key_bindings(editorAndLanguageClient);
    setup_commands(editorApp);
    setup_toggle_theme();

    // NOTE: Initially focus the editor.
    editorApp.getEditor()!.focus();

    // FIXME: Adjusting the layout on resize is currently broken.
    // let resizeTimer: number;
    // window.addEventListener("resize", () => {
    //   clearTimeout(resizeTimer);
    //   resizeTimer = window.setTimeout(() => {
    //     editorApp.getEditor()!.layout();
    //
    //   }, 100);
    // });

    return editorAndLanguageClient;
  } else {
    throw new Error(`No element with id: "${container_id}" found`);
  }
}

function setup_toggle_theme() {
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
