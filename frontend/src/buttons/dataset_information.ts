import type { Service } from "../types/backend";
import { SparqlEngine } from "../types/lsp_messages";
import type { EditorAndLanguageClient } from "../types/monaco";

export async function setupDatasetInformation(editorAndLanguageClient: EditorAndLanguageClient) {
  const datasetInformationModal = document.getElementById("datasetInformationModal")!;
  const datasetInformationButton = document.getElementById("datasetInformationButton")!;

  datasetInformationButton.addEventListener("click", async () => {
    await showDatasetInformation(editorAndLanguageClient);
    datasetInformationModal.classList.remove("hidden");
  });

  datasetInformationModal.addEventListener("click", () => {
    datasetInformationModal.classList.add("hidden");
  });

  datasetInformationModal.firstElementChild?.addEventListener("click", e => {
    e.stopPropagation();
  });
}

async function showDatasetInformation(editorAndLanguageClient: EditorAndLanguageClient): Promise<void> {
  const service = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service | null;
  const datasetUrl = document.getElementById("datasetUrl")!;
  const datasetDescription = document.getElementById("datasetDescription")!;
  const datasetNumberOfTriples = document.getElementById("datasetNumberOfTriples")!;
  const datasetNumberOfSubjects = document.getElementById("datasetNumberOfSubjects")!;
  const datasetNumberOfPredicates = document.getElementById("datasetNumberOfPredicates")!;
  const datasetNumberOfObjects = document.getElementById("datasetNumberOfObjects")!;
  if (service == null) {
    throw new Error("No backend was configured.");
  }

  if (service.engine != SparqlEngine.QLever) {
    throw new Error("Dataset information is only availiable for QLever-based Backends.");
  }
  fetch(`${service.url}?cmd=stats`).then(response => {
    if (!response.ok) {
      throw new Error("Could new retreive dataset information.")
    }
    return response.json()
  }).then(stats => {
    datasetUrl.innerText = service.url;
    datasetDescription.innerText = stats["name-index"];
    datasetNumberOfTriples.innerText = stats["num-triples-normal"].toLocaleString("en-US");
    datasetNumberOfSubjects.innerText = stats["num-subjects-normal"].toLocaleString("en-US");
    datasetNumberOfPredicates.innerText = stats["num-predicates-normal"].toLocaleString("en-US");
    datasetNumberOfObjects.innerText = stats["num-objects-normal"].toLocaleString("en-US");
  });
}
