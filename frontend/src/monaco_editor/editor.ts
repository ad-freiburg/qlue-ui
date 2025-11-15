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

interface EditorAndLanguageClient {
  editorApp: EditorApp;
  languageClient: MonacoLanguageClient;
}

export async function init(container_id: string): Promise<EditorAndLanguageClient> {
  const editorContainer = document.getElementById(container_id);
  if (editorContainer) {
    const configs = await buildWrapperConfig(
      editorContainer,
      `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?subject_name ?predicate_name ?date WHERE {
  VALUES ?p { wdt:P569 wdt:P570 wdt:P571 wdt:P585 wdt:P580 wdt:P582 wdt:P576 wdt:P3138 wdt:P1619 wdt:P575 wdt:P710 wdt:P2754 wdt:P1191 wdt:P3602 wdt:P729 wdt:P1249 wdt:P3999 wdt:P991 wdt:P3538 wdt:P730 wdt:P619 wdt:P6465 wdt:P713 wdt:P712 wdt:P2424 wdt:P711 wdt:P726 wdt:P3407 wdt:P1636 wdt:P3893 wdt:P837 wdt:P2669 wdt:P4602 wdt:P1839 wdt:P746 wdt:P1326 wdt:P620 wdt:P7589 wdt:P7588 wdt:P2960 wdt:P621 wdt:P6949 wdt:P4424 wdt:P5204 wdt:P1319 wdt:P2913 wdt:P3148 wdt:P4387 wdt:P574 wdt:P813 wdt:P622 wdt:P7295 wdt:P5017 wdt:P3390 wdt:P2285 wdt:P7495 wdt:P7162 wdt:P4243 wdt:P2311 }
  ?p_entity wikibase:directClaim ?p . ?p_entity rdfs:label ?predicate_name FILTER (LANG(?predicate_name) = "en")
  ?subject ?p ?date .
  ?subject rdfs:label ?subject_name FILTER (LANG(?subject_name) = "en")
  ?about schema:about ?subject . ?about wikibase:sitelinks ?sitelinks . 
  FILTER (MONTH(?date) = 5 && DAY(?date) = 22)
}
ORDER BY DESC(?sitelinks)`
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
