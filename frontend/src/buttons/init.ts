import type { Editor } from '../editor/init';
import { setupClearCache } from './clear_cache';
import { setupDatasetInformation } from './dataset_information';
import { setupDownload } from './download';
import { setupExecute } from './execute';
import { setupFormat } from './format';
import { setupFullResult } from './full_result';
import { setupHelp } from './help';

export function setupButtons(editor: Editor) {
  setupExecute();
  setupFormat(editor);
  setupDownload(editor);
  setupClearCache(editor);
  setupDatasetInformation(editor);
  setupHelp();
  setupFullResult();
}
