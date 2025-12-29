// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import * as monaco from 'monaco-editor';
import type { Editor } from './init';

export function setup_commands(editor: Editor) {
  monaco.editor.addCommand({
    id: 'triggerNewCompletion',
    run: () => {
      editor.editorApp.getEditor()!.trigger('editor', 'editor.action.triggerSuggest', {});
    },
  });
}
