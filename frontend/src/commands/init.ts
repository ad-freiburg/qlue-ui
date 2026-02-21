import type { Editor } from '../editor/init';
import { clearCache } from '../buttons/clear_cache';
import { executeQuery } from '../buttons/execute';
import { formatDocument } from '../buttons/format';
import { openExamples } from '../examples/utils';
import { openParseTree } from '../parse_tree/init';
import { openQueryExecutionTree } from '../query_execution_tree/init';
import { openTemplatesEditor } from '../templates/init';
import { displayVersion } from '../utils';
import { closeCommandPrompt, handleClickEvents } from './utils';
import { createExample, updateExample } from './examples';

type CommandHandler = (editor: Editor, params: string[]) => void;
const commands: Record<string, CommandHandler> = {};
const commandHistory: string[] = [];
let commandHistoryPointer: number = -1;

/**
 * Initializes the vim-style command prompt (`:command`) with built-in
 * commands (`updateExample`, `parseTree`) and arrow-key history navigation.
 */
export function setupCommands(editor: Editor) {
  handleClickEvents();
  registerCommand('updateExample', updateExample);
  registerCommand('createExample', createExample);
  registerCommand('parseTree', openParseTree);
  registerCommand('templates', openTemplatesEditor);
  registerCommand('analysis', openQueryExecutionTree);
  registerCommand('clearCache', clearCache);
  registerCommand('format', formatDocument);
  registerCommand('examples', openExamples);
  registerCommand('execute', executeQuery);
  registerCommand('version', displayVersion);

  const commandPrompt = document.getElementById('commandPrompt')! as HTMLInputElement;
  commandPrompt.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      const input = commandPrompt.value;
      if (input === '') return;
      commandHistory.push(input);
      commandHistoryPointer++;
      const [command, ...params] = parseInput(input);
      if (command in commands) {
        commands[command](editor, params);
        closeCommandPrompt();
        setTimeout(() => editor.focus(), 50);
      } else {
        document.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              type: 'error',
              message: 'Unknown command: ' + command,
              duration: 3000,
            },
          })
        );
      }
    } else if (event.key === 'ArrowUp' && commandHistoryPointer >= 0) {
      commandPrompt.value = commandHistory[commandHistoryPointer];
      commandHistoryPointer = Math.max(commandHistoryPointer - 1, 0);
      event.preventDefault();
    } else if (event.key === 'ArrowDown' && commandHistoryPointer < commandHistory.length - 1) {
      commandHistoryPointer++;
      commandPrompt.value = commandHistory[commandHistoryPointer];
    } else if (event.key === 'Escape') {
      closeCommandPrompt();
    } else {
      commandHistoryPointer = commandHistory.length - 1;
    }
  });
}

/** Splits input into command name + quoted arguments. Unquoted words are kept as-is. */
function parseInput(input: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|\S+/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[0]);
  }
  return tokens;
}

function registerCommand(name: string, commandHandler: CommandHandler) {
  commands[name] = commandHandler;
}
