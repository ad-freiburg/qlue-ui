// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { init } from './monaco_editor/editor.ts';
import { setupButtons } from './buttons.ts';
import { configureBackends } from './backend/backends.ts';
import { setupThemeSwitcher } from './theme_switcher.ts';
import { setupResults } from './results.ts';

setupThemeSwitcher();
init('editor')
  .then(async (editorAndLanguageClient) => {
    setupButtons(editorAndLanguageClient);
    configureBackends(editorAndLanguageClient);
    setupResults(editorAndLanguageClient);
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });
