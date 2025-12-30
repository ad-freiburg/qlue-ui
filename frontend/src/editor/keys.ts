// ┌─────────────────────────────────┐ \\
// │ Copyright © 2025 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

import * as monaco from 'monaco-editor';
import type { FormattingResult, JumpResult } from '../types/lsp_messages';
import type { Edit } from '../types/monaco';
import type { Editor } from './init';

export function setup_key_bindings(editor: Editor) {
  const monacoEditor = editor.editorApp.getEditor()!;

  // NOTE: execute query on Ctrl + Enter
  monacoEditor.addAction({
    id: 'Execute Query',
    label: 'Execute',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run() {
      window.dispatchEvent(new Event('cancel-or-execute'));
    },
  });

  // NOTE format on Ctrl + f
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
    monacoEditor.getAction('editor.action.formatDocument')!.run();
  });

  // NOTE:jump to next or prev position (Alt + n, Alt + p)
  monaco.editor.addCommand({
    id: 'jumpToNextPosition',
    run: (_get, args) => {
      // NOTE: Format document
      editor.languageClient
        .sendRequest('textDocument/formatting', {
          textDocument: { uri: editor.getDocumentUri() },
          options: {
            tabSize: 2,
            insertSpaces: true,
          },
        })
        .then((response) => {
          const jumpResult = response as FormattingResult;
          const edits: Edit[] = jumpResult.map((edit) => {
            return {
              range: new monaco.Range(
                edit.range.start.line + 1,
                edit.range.start.character + 1,
                edit.range.end.line + 1,
                edit.range.end.character + 1
              ),
              text: edit.newText,
            };
          });
          monacoEditor.getModel()!.applyEdits(edits);

          // NOTE: request jump position
          const cursorPosition = monacoEditor.getPosition()!;
          editor.languageClient
            .sendRequest('qlueLs/jump', {
              textDocument: { uri: editor.getDocumentUri() },
              position: {
                line: cursorPosition.lineNumber - 1,
                character: cursorPosition.column - 1,
              },
              previous: args === 'prev',
            })
            .then((response) => {
              // NOTE: move cursor
              if (response) {
                const typedResponse = response as JumpResult;
                const newCursorPosition = {
                  lineNumber: typedResponse.position.line + 1,
                  column: typedResponse.position.character + 1,
                };
                if (typedResponse.insertAfter) {
                  monacoEditor.executeEdits('jumpToNextPosition', [
                    {
                      range: new monaco.Range(
                        newCursorPosition.lineNumber,
                        newCursorPosition.column,
                        newCursorPosition.lineNumber,
                        newCursorPosition.column
                      ),
                      text: typedResponse.insertAfter,
                    },
                  ]);
                }
                monacoEditor.setPosition(newCursorPosition, 'jumpToNextPosition');
                if (typedResponse.insertBefore) {
                  monacoEditor.getModel()?.applyEdits([
                    {
                      range: new monaco.Range(
                        newCursorPosition.lineNumber,
                        newCursorPosition.column,
                        newCursorPosition.lineNumber,
                        newCursorPosition.column
                      ),
                      text: typedResponse.insertBefore,
                    },
                  ]);
                }
              }
            });
        });
      monacoEditor.trigger('jumpToNextPosition', 'editor.action.formatDocument', {});
    },
  });
  monaco.editor.addKeybindingRule({
    command: 'jumpToNextPosition',
    commandArgs: 'next',
    keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma,
  });
  monaco.editor.addKeybindingRule({
    command: 'jumpToNextPosition',
    commandArgs: 'prev',
    keybinding: monaco.KeyMod.Alt | monaco.KeyCode.Minus,
  });
}
