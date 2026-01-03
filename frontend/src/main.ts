// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import './toast';
import { setupEditor } from './editor/init';
import { configureBackends } from './backend/backends';
import { setupThemeSwitcher } from './buttons/theme_switcher';
import { setupExamples } from './examples/init';
import { setupQueryExecutionTree } from './query_execution_tree/init';
import { setupShare } from './share';
import { removeLoadingScreen } from './utils';
import { handleRequestParameter } from './request_params';
// import { setupQueryBenchmark } from './benchmark/init';
import { setupButtons } from './buttons/init';
import { setupResults } from './results/init';
import { setupSettings } from './settings/init';

setupThemeSwitcher();
setupEditor('editor')
  .then(async (editor) => {
    setupQueryExecutionTree(editor);
    setupExamples(editor);
    setupResults(editor);
    setupSettings(editor);
    setupButtons(editor);
    setupShare(editor);
    await configureBackends(editor);
    // setupQueryBenchmark(editor);
    handleRequestParameter(editor);
    removeLoadingScreen();
  });

