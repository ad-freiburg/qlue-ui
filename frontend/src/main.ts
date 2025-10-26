// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import { init } from './monaco_editor/editor.ts';
import { setup_buttons } from './buttons.ts';
import { configure_backends } from './backend/backends.ts';
import { setup_theme_switcher } from './theme_switcher.ts';
import { setup_results } from './results.ts';

setup_theme_switcher();
init('editor')
  .then((editorAndLanguageClient) => {
    setup_buttons(editorAndLanguageClient);
    configure_backends(editorAndLanguageClient);
    setup_results(editorAndLanguageClient);
  })
  .catch((err) => {
    console.error('Monaco-editor initialization failed:\n', err);
  });
