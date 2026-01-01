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

const start = performance.now();
setupThemeSwitcher();
let last = performance.now();
setupEditor('editor')
  .then(async (editor) => {
    console.debug(`editor initialized in ${performance.now() - last}ms`)
    last = performance.now();

    setupQueryExecutionTree(editor);

    setupExamples(editor);

    setupResults(editor);

    setupButtons(editor);

    setupShare(editor);

    last = performance.now();
    await configureBackends(editor);
    console.debug(`backends initialized in ${performance.now() - last}ms`)

    // setupQueryBenchmark(editor);
    handleRequestParameter(editor);
    removeLoadingScreen();
    console.debug(`total: ${performance.now() - start}ms`)
  });

