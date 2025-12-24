// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { init } from './monaco_editor/editor';
import { configureBackends } from './backend/backends';
import { setupThemeSwitcher } from './theme_switcher';
import { setupResults } from './results/init';
import { setupExamples } from './examples/init';
import './toast';
import { setupQueryExecutionTree } from './query_execution_tree/init';
import { setupShare } from './share';
import { setupFormat } from './format';
import { setupDownload } from './download';
import { setupClearCache } from './clear_cache';
import { setupDatasetInformation } from './dataset_information';
import { executeQueryAndShowResults } from './results/init';
import { setupQueryBenchmark } from './benchmark/init';


document.addEventListener("DOMContentLoaded", () => {
  setupQueryBenchmark();
});

setupThemeSwitcher();
init('editor')
  .then(async (editorAndLanguageClient) => {
    setupQueryExecutionTree(editorAndLanguageClient);
    setupExamples(editorAndLanguageClient);
    setupResults(editorAndLanguageClient);
    setupShare(editorAndLanguageClient);
    setupFormat(editorAndLanguageClient);
    setupDownload(editorAndLanguageClient);
    setupClearCache(editorAndLanguageClient);
    setupDatasetInformation(editorAndLanguageClient);
    await configureBackends(editorAndLanguageClient);
    const params = new URLSearchParams(window.location.search);
    const exec = params.get("exec");
    if (exec) {
      executeQueryAndShowResults(editorAndLanguageClient);
    }
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });


