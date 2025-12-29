// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { setupEditor } from './editor/init';
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
setupEditor('editor')
  .then(async (editor) => {
    setupQueryExecutionTree(editor);
    setupExamples(editor);
    setupResults(editor);
    setupButtons(editor);
    setupShare(editor);
    await configureBackends(editor);
    // setupQueryBenchmark(editor);
    handleRequestParameter(editor);
    removeLoadingScreen();
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });

