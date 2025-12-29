import type { Editor } from "../editor/init";
import type { Service } from "../types/backend";
import { setShareLink } from "../share";
import { clear, run } from "./benchmark_viz";

export async function setupQueryBenchmark(editor: Editor) {
  const executeButton = document.getElementById('executeButton')! as HTMLButtonElement;
  const container = document.getElementById('benchmarkContainer')! as HTMLDivElement;
  const backend = await editor.languageClient.sendRequest("qlueLs/getBackend", {}) as Service;
  executeButton.addEventListener("click", async () => {
    await clear();
    setShareLink(editor, backend);
    container.classList.remove("hidden");
    run(editor.getContent());
  });
}
