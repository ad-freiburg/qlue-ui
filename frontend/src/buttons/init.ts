import type { EditorAndLanguageClient } from "../types/monaco";
import { setupClearCache } from "./clear_cache";
import { setupDatasetInformation } from "./dataset_information";
import { setupDownload } from "./download";
import { setupFormat } from "./format";

export function setupButtons(editorAndLanguageClient: EditorAndLanguageClient) {
  setupFormat(editorAndLanguageClient);
  setupDownload(editorAndLanguageClient);
  setupClearCache(editorAndLanguageClient);
  setupDatasetInformation(editorAndLanguageClient);
}
