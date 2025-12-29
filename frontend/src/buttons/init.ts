import type { EditorAndLanguageClient } from "../types/monaco";
import { setupClearCache } from "./clear_cache";
import { setupDatasetInformation } from "./dataset_information";
import { setupDownload } from "./download";
import { setupExecute } from "./execute";
import { setupFormat } from "./format";

export function setupButtons(editorAndLanguageClient: EditorAndLanguageClient) {
  setupExecute();
  setupFormat(editorAndLanguageClient);
  setupDownload(editorAndLanguageClient);
  setupClearCache(editorAndLanguageClient);
  setupDatasetInformation(editorAndLanguageClient);
}
