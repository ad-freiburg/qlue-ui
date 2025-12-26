import * as d3 from 'd3';
import { getShareLinkId } from "../share";
import type { Meta } from "../types/lsp_messages";
import type { EditorAndLanguageClient } from "../types/monaco";
import { getEditorContent } from "../utils";
import type { Service } from '../types/backend';

export function clearQueryStats() {
  document.getElementById('resultSize')!.innerText = "?";
  document.getElementById('queryTimeTotal')!.innerText = "0";
  document.getElementById('queryTimeCompute')!.innerText = "0";
  document.getElementById('queryTimeComputeContainer')!.classList.add("hidden");
}

export function showQueryMetaData(meta: Meta) {
  const sizeEl = document.getElementById('resultSize')!;
  sizeEl.classList.add("normal-nums");
  sizeEl.classList.remove("tabular-nums");
  sizeEl.innerText = meta['result-size-total'].toLocaleString("en-US");
  document.getElementById('queryTimeComputeContainer')!.classList.remove("hidden");
  document.getElementById('queryTimeCompute')!.innerText = meta['query-time-ms'].toLocaleString("en-US") + "ms";
}


export function showLoadingScreen() {
  const resultsContainer = document.getElementById('results') as HTMLSelectElement;
  const resultsTableContainer = document.getElementById(
    'resultsTableContainer'
  ) as HTMLSelectElement;
  const resultsLoadingScreen = document.getElementById('resultsLoadingScreen') as HTMLSelectElement;
  const resultsError = document.getElementById('resultsError') as HTMLSelectElement;
  resultsTableContainer.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  resultsLoadingScreen.classList.remove('hidden');
  resultsError.classList.add('hidden');
}

// Hides the loading screen and shows the results container.
// Also scrolles to the results container.
export function showResults() {
  const resultsTableContainer = document.getElementById(
    'resultsTableContainer'
  ) as HTMLSelectElement;
  const resultsLoadingScreen = document.getElementById('resultsLoadingScreen') as HTMLSelectElement;

  resultsLoadingScreen.classList.add('hidden');
  resultsTableContainer.classList.remove('hidden');
}

export function scrollToResults() {
  const resultsContainer = document.getElementById('results') as HTMLSelectElement;
  window.scrollTo({
    top: resultsContainer.offsetTop + 10,
    behavior: 'smooth',
  });
}


export function startQueryTimer(): d3.Timer {
  const timerEl = document.getElementById('queryTimeTotal')!;
  timerEl.classList.remove("normal-nums");
  timerEl.classList.add("tabular-nums");
  const timer = d3.timer((elapsed) => {
    timerEl.innerText = elapsed.toLocaleString("en-US") + "ms";
  });
  return timer;
}

export function stopQueryTimer(timer: d3.Timer) {
  const timerEl = document.getElementById('queryTimeTotal')!;
  timerEl.classList.add("normal-nums");
  timerEl.classList.remove("tabular-nums");
  timer.stop()
}

export function setShareLink(editorAndLanguageClient: EditorAndLanguageClient, backend: Service) {
  const query = getEditorContent(editorAndLanguageClient);
  getShareLinkId(query).then(id => {
    history.pushState({}, "", `/${backend.name}/${id}${window.location.search}`)
  });
}


export type QueryStatus =
  | "idle"
  | "running"
  | "canceling"

export function toggleExecuteCancelButton(queryStatus: QueryStatus) {
  const executeButton = document.getElementById('executeButton')! as HTMLButtonElement;
  switch (queryStatus) {
    case "idle":
      executeButton.children[0].classList.remove("hidden");
      executeButton.children[0].classList.add("inline-flex");
      executeButton.children[1].classList.add("hidden");
      executeButton.children[1].classList.remove("inline-flex");
      break;
    case "running":
      executeButton.children[0].classList.add("hidden");
      executeButton.children[0].classList.remove("inline-flex");
      executeButton.children[1].classList.remove("hidden");
      executeButton.children[1].classList.add("inline-flex");
      executeButton.children[1].children[0].classList.add("hidden");
      executeButton.children[1].children[1].classList.remove("hidden");
      break;
    case "canceling":
      executeButton.children[0].classList.add("hidden");
      executeButton.children[0].classList.remove("inline-flex");
      executeButton.children[1].classList.remove("hidden");
      executeButton.children[1].classList.add("inline-flex");
      executeButton.children[1].children[0].classList.remove("hidden");
      executeButton.children[1].children[1].classList.add("hidden");
      break
  }
}


// function setupInfiniteScroll(editorAndLanguageClient: EditorAndLanguageClient) {
//   const window_size = 100;
//   let offset = window_size;
//   let mutex = false;
//   let done = false;
//   const resultReloadingAnimation = document.getElementById('resultReloadingAnimation')!;
//
//   async function onScroll() {
//     if (mutex || done) return;
//     const scrollPosition = window.innerHeight + window.scrollY;
//     const pageHeight = document.body.offsetHeight;
//     if (scrollPosition >= pageHeight - 1000) {
//       resultReloadingAnimation.classList.remove('hidden');
//       mutex = true;
//       const results = await executeQuery(editorAndLanguageClient, window_size, offset);
//       const resultsTable = document.getElementById('resultsTable')! as HTMLTableElement;
//       const rows = renderTableRows(results, offset);
//       resultsTable.appendChild(rows);
//       resultReloadingAnimation.classList.add('hidden');
//       offset += window_size;
//       mutex = false;
//     }
//   }
//
//   function stopReload() {
//     done = true;
//   }
//
//   function reset() {
//     offset = window_size;
//     mutex = false;
//     done = false;
//   }
//
//   document.addEventListener('scroll', onScroll);
//   document.addEventListener('infinite-reset', () => {
//     reset();
//   });
//   document.addEventListener('infinite-stop', stopReload);
// }
