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
import { removeLoadingScreen, showCommitHash } from './utils';
import { handleRequestParameter } from './request_params';
// import { setupQueryBenchmark } from './benchmark/init';
import { setupButtons } from './buttons/init';
import { setupResults } from './results/init';
import { setupSettings } from './settings/init';
import { setupKeybindings } from './keybindings';
import { setupCommands } from './commands/init';
import { setupParseTree } from './parse_tree/init';

showCommitHash();
setupThemeSwitcher();
setupEditor('editor').then(async (editor) => {
  // INFO: Expose editor for e2e test access via page.evaluate().
  (window as any).__editor = editor;
  setupSettings(editor);
  setupQueryExecutionTree(editor);
  setupExamples(editor);
  setupResults(editor);
  setupButtons(editor);
  setupShare(editor);
  setupKeybindings();
  setupCommands(editor);
  setupParseTree(editor);
  await configureBackends(editor);
  // setupQueryBenchmark(editor);
  handleRequestParameter(editor);
  removeLoadingScreen();
});
