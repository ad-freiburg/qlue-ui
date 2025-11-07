// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { init } from './monaco_editor/editor.ts';
import { setupButtons } from './buttons/init.ts';
import { configureBackends } from './backend/backends.ts';
import { setupThemeSwitcher } from './theme_switcher.ts';
import { setupResults } from './results.ts';
import { setupExamples } from './examples/init.ts';

import './toast.ts';

setupThemeSwitcher();
init('editor')
  .then(async (editorAndLanguageClient) => {
    setupExamples(editorAndLanguageClient);
    setupResults(editorAndLanguageClient);
    setupButtons(editorAndLanguageClient);
    await configureBackends(editorAndLanguageClient);
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });
