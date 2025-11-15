// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { init } from './monaco_editor/editor.ts';
import { configureBackends } from './backend/backends.ts';
import { setupThemeSwitcher } from './theme_switcher.ts';
import { setupResults } from './results.ts';
import { setupExamples } from './examples/init.ts';

import './toast.ts';
import { setupQueryExecutionTree } from './query_tree/init.ts';
import { setupShare } from './share.ts';
import { setupFormat } from './format.ts';
import { setupDownload } from './download.ts';
import { setupClearCache } from './clear_cache.ts';

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
    await configureBackends(editorAndLanguageClient);
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });
