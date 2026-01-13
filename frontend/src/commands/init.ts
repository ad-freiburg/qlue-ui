import type { Editor } from "../editor/init";
import { lastExample } from "../examples/init";
import { reloadExample } from "../examples/utils";
import { getCookie } from "../utils";
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
      commandPrompt.value = commandHistory[commandHistoryPointer];
      commandHistoryPointer = Math.max(commandHistoryPointer - 1, 0);
      event.preventDefault();
    }
    else if (event.key === "ArrowDown" && commandHistoryPointer < commandHistory.length - 1) {
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
    const csrftoken = getCookie("csrftoken");
    if (csrftoken == null) {
      document.dispatchEvent(new CustomEvent('toast', {
        detail: {
          type: "error",
          message: "missing CSRF token!<br>Log into the API to update examples.",
          duration: 3000
        }
      }));
      return
    }
    fetch(`${import.meta.env.VITE_API_URL}/api/backends/${lastExample.service}/examples`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
        'X-CSRFToken': csrftoken,
      },
      body: JSON.stringify({ name: lastExample.name, query: editor.getContent() })
    }).then(async response => {
      if (!response.ok) {
        console.log(response);
        let message = `Example "${lastExample!.name}" update failed`;
        if (response.status == 403) {
          message = "Missing permissions!<br>Log into the API to update examples.";
        }
        document.dispatchEvent(new CustomEvent('toast', {
          detail: {
            type: "error",
            message,
            duration: 3000
          }
        }));

      } else {
        document.dispatchEvent(new CustomEvent('toast', {
          detail: {
            type: "success",
            message: `Example "${lastExample!.name}" updated`,
            duration: 3000
          }
        }));
        reloadExample(editor);
        closeCommandPrompt();
        setTimeout(() => editor.focus(), 50);
      }
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
