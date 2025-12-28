// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { init } from './monaco_editor/editor';
import { configureBackends } from './backend/backends';
import { setupThemeSwitcher } from './theme_switcher';
import { setupExamples } from './examples/init';
import './toast';
import { setupQueryExecutionTree } from './query_execution_tree/init';
import { setupShare } from './share';
import { setupFormat } from './format';
import { setupDownload } from './download';
import { setupClearCache } from './clear_cache';
import { setupDatasetInformation } from './dataset_information';
import { removeLoadingScreen } from './utils';
import { handleRequestParameter } from './request_params';
import { setupQueryBenchmark } from './benchmark/init';

setupThemeSwitcher();
init('editor')
  .then(async (editorAndLanguageClient) => {
    setupQueryExecutionTree(editorAndLanguageClient);
    setupExamples(editorAndLanguageClient);
    // setupResults(editorAndLanguageClient);
    setupShare(editorAndLanguageClient);
    setupFormat(editorAndLanguageClient);
    setupDownload(editorAndLanguageClient);
    setupClearCache(editorAndLanguageClient);
    setupDatasetInformation(editorAndLanguageClient);
    setupQueryBenchmark(editorAndLanguageClient);
    await configureBackends(editorAndLanguageClient);
    handleRequestParameter(editorAndLanguageClient);
    removeLoadingScreen();
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });

