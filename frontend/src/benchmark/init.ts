import type { Editor } from '../editor/init';
import { setShareLink } from '../share';
import type { QlueLsServiceConfig } from '../types/backend';
import { clear, run } from './benchmark_viz';

/** Initializes the query benchmark panel (currently unused). */
export async function setupQueryBenchmark(editor: Editor) {
  const executeButton = document.getElementById('executeButton')! as HTMLButtonElement;
  const container = document.getElementById('benchmarkContainer')! as HTMLDivElement;
  const backend = (await editor.languageClient.sendRequest('qlueLs/getBackend', {})) as QlueLsServiceConfig;
  executeButton.addEventListener('click', async () => {
    await clear();
    setShareLink(editor, backend);
    container.classList.remove('hidden');
    run(editor.getContent());
  });
}
