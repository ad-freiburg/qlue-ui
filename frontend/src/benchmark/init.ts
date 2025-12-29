import { setShareLink } from "../share";
import type { Service } from "../types/backend";
import type { EditorAndLanguageClient } from "../types/monaco";
import { getEditorContent } from "../utils";
import { clear, run } from "./benchmark_viz";

export async function setupQueryBenchmark(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById('executeButton')! as HTMLButtonElement;
  const container = document.getElementById('benchmarkContainer')! as HTMLDivElement;
  const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service;
  executeButton.addEventListener("click", async () => {
    await clear();
    setShareLink(editorAndLanguageClient, backend);
    container.classList.remove("hidden");
    run(getEditorContent(editorAndLanguageClient));
  });
}
