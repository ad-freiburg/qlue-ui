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

export interface Editor {
  editorApp: EditorApp;
  languageClient: MonacoLanguageClient;
  getContent(): string;
  setContent(content: string): void;
  focus(): void;
  getDocumentUri(): string;
}

export async function setupEditor(container_id: string): Promise<Editor> {
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

    let editor: Editor = {
      editorApp: editorApp,
      languageClient: languageClient,
      getContent(): string {
        return this.editorApp.getEditor()?.getValue()!;
      },
      setContent(content: string) {
        this.editorApp.getEditor()?.setValue(content);
      },
      focus() {
        this.editorApp.getEditor()!.focus();
      },
      getDocumentUri() {
        return this.editorApp.getEditor()!.getModel()!.uri.toString();
      },
    };


    await editor.editorApp.start(editorContainer);

    setup_key_bindings(editor);
    setup_commands(editor);
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

    return editor;
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
