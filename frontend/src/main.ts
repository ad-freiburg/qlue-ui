// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { init } from './monaco_editor/editor';
import { configureBackends } from './backend/backends';
import { setupThemeSwitcher } from './buttons/theme_switcher';
import { setupExamples } from './examples/init';
import './toast';
import { setupQueryExecutionTree } from './query_execution_tree/init';
import { setupShare } from './share';
import { removeLoadingScreen } from './utils';
import { handleRequestParameter } from './request_params';
// import { setupQueryBenchmark } from './benchmark/init';
import { setupButtons } from './buttons/init';
import { setupResults } from './results/init';

setupThemeSwitcher();
init('editor')
  .then(async (editorAndLanguageClient) => {
    setupQueryExecutionTree(editorAndLanguageClient);
    setupExamples(editorAndLanguageClient);
    setupResults(editorAndLanguageClient);
    setupButtons(editorAndLanguageClient);
    setupShare(editorAndLanguageClient);
    await configureBackends(editorAndLanguageClient);
    // setupQueryBenchmark(editorAndLanguageClient);
    handleRequestParameter(editorAndLanguageClient);
    removeLoadingScreen();
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });

