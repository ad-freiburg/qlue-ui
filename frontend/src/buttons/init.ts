import type { EditorAndLanguageClient } from '../types/monaco';
import { setup as setup_download } from './download';
import { setup as setup_format } from './format';
import { setup as setup_share } from './share';

export function setupButtons(editorAndLanguageClient: EditorAndLanguageClient) {
  setup_format(editorAndLanguageClient);
  setup_download(editorAndLanguageClient);
  setup_share(editorAndLanguageClient);
}
