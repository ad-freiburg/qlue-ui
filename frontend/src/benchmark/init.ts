import type { Editor } from '../editor/init';
import { clear, run } from './benchmark_viz';

/** Initializes the query benchmark panel (currently unused). */
export async function setupQueryBenchmark(editor: Editor) {
  const executeButton = document.getElementById('executeButton')! as HTMLButtonElement;
  const container = document.getElementById('benchmarkContainer')! as HTMLDivElement;
  executeButton.addEventListener('click', async () => {
    await clear();
    container.classList.remove('hidden');
    run(editor.getContent());
  });
}
