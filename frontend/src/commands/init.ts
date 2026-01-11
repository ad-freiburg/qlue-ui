import type { Editor } from "../editor/init";
import { lastExample } from "../examples/init";
import { reloadExample } from "../examples/utils";
import { closeCommandPrompt, handleClickEvents } from "./utils";

type CommandHandler = (editor: Editor, params: string[]) => void;
const commands: Record<string, CommandHandler> = {};
const commandHistory: string[] = [];
let commandHistoryPointer: number = -1;

export function setupCommands(editor: Editor) {
  handleClickEvents();
  registerCommand("updateExample", updateExample);
  const commandPrompt = document.getElementById("commandPrompt")! as HTMLInputElement;
  commandPrompt.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const command = commandPrompt.value;
      if (command === "") return
      commandHistory.push(command);
      console.log(commandHistory);
      commandHistoryPointer++;
      if (command in commands) {
        commands[command](editor, []);
        closeCommandPrompt();
        setTimeout(() => editor.focus(), 50);
      } else {
        document.dispatchEvent(new CustomEvent('toast', {
          detail: {
            type: "error",
            message: "Unknown command: " + command,
            duration: 3000
          }
        }));
      }
    }
    else if (event.key === "ArrowUp" && commandHistoryPointer >= 0) {
      console.log(commandHistoryPointer);
      commandPrompt.value = commandHistory[commandHistoryPointer];
      commandHistoryPointer = Math.max(commandHistoryPointer - 1, 0);
      event.preventDefault();
    }
    else if (event.key === "ArrowDown" && commandHistoryPointer < commandHistory.length - 1) {
      console.log(commandHistoryPointer);
      commandHistoryPointer++;
      commandPrompt.value = commandHistory[commandHistoryPointer];
    }
    else if (event.key === "Escape") {
      closeCommandPrompt();
    } else {
      commandHistoryPointer = commandHistory.length - 1;
    }
  });
}

async function updateExample(editor: Editor) {
  if (lastExample) {
    fetch(`${import.meta.env.VITE_API_URL}/api/backends/${lastExample.service}/examples`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: lastExample.name, query: editor.getContent() })
    }).then(async () => {
      document.dispatchEvent(new CustomEvent('toast', {
        detail: {
          type: "success",
          message: `Example "${lastExample!.name} updated`,
          duration: 3000
        }
      }));
      reloadExample(editor);
      closeCommandPrompt();
      setTimeout(() => editor.focus(), 50);
    }).catch(err => {
      console.error(err);
      document.dispatchEvent(new CustomEvent('toast', {
        detail: {
          type: "error",
          message: "Example could not be updated!",
          duration: 3000
        }
      }));
    });

  } else {
    document.dispatchEvent(new CustomEvent('toast', {
      detail: {
        type: "error",
        message: "There was no example selected jet.",
        duration: 3000
      }
    }));
  }
}

function registerCommand(name: string, commandHandler: CommandHandler) {
  commands[name] = commandHandler;
}
