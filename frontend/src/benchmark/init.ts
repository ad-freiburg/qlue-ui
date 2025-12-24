import type { EditorAndLanguageClient } from "../types/monaco";
import { getEditorContent } from "../utils";
import { run } from "./benchmark_viz";

export function setupQueryBenchmark(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById('executeButton')! as HTMLButtonElement;
  const container = document.getElementById('benchmarkContainer')! as HTMLDivElement;
  executeButton.addEventListener("click", () => {
    container.classList.remove("hidden");
    run(getEditorContent(editorAndLanguageClient))
  });
}
