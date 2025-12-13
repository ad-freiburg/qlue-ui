import { getShareLinkId } from '../share';
import type { Service } from '../types/backend';
import type { ExecuteQueryResult, PartialResult } from '../types/lsp_messages';
import type { EditorAndLanguageClient } from '../types/monaco';
import type { QueryExecutionTree } from '../types/query_execution_tree';
import type { SPARQLResults } from '../types/rdf';
import { getEditorContent } from '../utils';
import { renderResultsTable } from './table';


export interface ExecuteQueryEventDetails {
  queryId: string
}

export interface ExecuteQueryEndEventDetails {
  queryExecutionTree: QueryExecutionTree
}

export async function setupResults(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById('ExecuteButton')! as HTMLButtonElement;
  // setupInfiniteScroll(editorAndLanguageClient);
  executeButton.addEventListener('click', async () => {
    if (executeButton.firstElementChild!.classList.contains("hidden")) {
      window.dispatchEvent(new CustomEvent("execute-query-end"));
    }
    else {
      executeQueryAndShowResults(editorAndLanguageClient);
    }
  });
  window.addEventListener("execute-query", toggleExecuteCancelButton);
  window.addEventListener("execute-query-end", toggleExecuteCancelButton);
}

function toggleExecuteCancelButton() {
  const executeButton = document.getElementById('ExecuteButton')! as HTMLButtonElement;
  executeButton.firstElementChild!.classList.toggle("hidden");
  executeButton.firstElementChild!.classList.toggle("inline-flex");
  executeButton.children[1].classList.toggle("hidden");
  executeButton.children[1].classList.toggle("inline-flex");
}

export async function executeQueryAndShowResults(editorAndLanguageClient: EditorAndLanguageClient) {
  // TODO: infinite scrolling
  // document.dispatchEvent(new Event('infinite-reset'));


  // NOTE: Check if SPARQL endpoint is configured.
  const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service | null;
  if (!backend) {
    document.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          type: 'error',
          message: 'No SPARQL endpoint configured.',
          duration: 2000,
        },
      })
    );
    return;
  }

  showLoadingScreen();
  setupStats();

  // NOTE: Get ShareLink and update URL
  setShareLink(editorAndLanguageClient, backend);
  executeQuery(editorAndLanguageClient, 100, 0).then(timeMs => {
    showResults();
    document.getElementById('queryTimeTotal')!.innerText = timeMs.toLocaleString("en-US") + "ms";
    window.dispatchEvent(new CustomEvent("execute-query-end"));
  }).catch(err => {
    console.log(err);
  });
  renderResults2(editorAndLanguageClient);
}

function setShareLink(editorAndLanguageClient: EditorAndLanguageClient, backend: Service) {
  const query = getEditorContent(editorAndLanguageClient);
  getShareLinkId(query).then(id => {
    history.pushState({}, "", `/${backend.name}/${id}${window.location.search}`)
  });
}

// Executes the query in a layz manner.
// Returns the time the query took end-to-end.
async function executeQuery(
  editorAndLanguageClient: EditorAndLanguageClient,
  limit: number = 100,
  offset: number = 0
): Promise<number> {
  const queryId = crypto.randomUUID();
  window.dispatchEvent(new CustomEvent("execute-query", {
    detail: {
      queryId
    }
  }));
  let response = (await editorAndLanguageClient.languageClient
    .sendRequest('qlueLs/executeQuery', {
      textDocument: {
        uri: editorAndLanguageClient.editorApp.getEditor()!.getModel()!.uri.toString(),
      },
      queryId: queryId,
      maxResultSize: limit,
      resultOffset: offset,
      lazy: true
    })
    .catch((err) => {
      const resultsErrorMessage = document.getElementById('resultErrorMessage')! as HTMLSpanElement;
      const resultsErrorQuery = document.getElementById('resultsErrorQuery')! as HTMLPreElement;
      if (err.data) {
        switch (err.data.type) {
          case 'QLeverException':
            resultsErrorMessage.textContent = err.data.exception;
            if (err.data.metadata) {
              resultsErrorQuery.innerHTML =
                err.data.query.substring(0, err.data.metadata.startIndex) +
                `<span class="text-red-500 dark:text-red-600 font-bold">${err.data.query.substring(err.data.metadata.startIndex, err.data.metadata.stopIndex + 1)}</span>` +
                err.data.query.substring(err.data.metadata.stopIndex + 1);
            } else {
              resultsErrorQuery.innerHTML = err.data.query;
            }
            break;
          case 'Connection':
            resultsErrorMessage.innerHTML = `The connection to the SPARQL endpoint is broken (${err.data.statusText}).<br> The most common cause is that the QLever server is down. Please try again later and contact us if the error perists`;
            resultsErrorQuery.innerHTML = err.data.query;
            break;
          default:
            resultsErrorMessage.innerHTML = `Something went wrong but we don't know what...`;
            break;
        }
      }
      const resultsContainer = document.getElementById('results') as HTMLSelectElement;
      resultsContainer.classList.add('hidden');
      const resultsError = document.getElementById('resultsError') as HTMLSelectElement;
      resultsError.classList.remove('hidden');
      window.scrollTo({
        top: resultsError.offsetTop - 70,
        behavior: 'smooth',
      });
      throw new Error('Query processing error');
    })) as ExecuteQueryResult;
  return response.timeMs
}

function renderResults2(editorAndLanguageClient: EditorAndLanguageClient) {
  const sparqlResult: SPARQLResults = {
    head: { vars: [] },
    results: { bindings: [] }
  };

  let messageCounter = 0;
  editorAndLanguageClient.languageClient.onNotification("qlueLs/partialResult", (partialResult: PartialResult) => {
    messageCounter++;
    if ("header" in partialResult) {
      sparqlResult.head = partialResult.header.head;
    }
    else {
      sparqlResult.results.bindings = partialResult.bindings;
    }
    if (messageCounter == 2) {
      renderResultsTable(editorAndLanguageClient, sparqlResult);
      showResults();
    }
  });
}

function showLoadingScreen() {
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
function showResults() {
  const resultsContainer = document.getElementById('results') as HTMLSelectElement;
  const resultsTableContainer = document.getElementById(
    'resultsTableContainer'
  ) as HTMLSelectElement;
  const resultsLoadingScreen = document.getElementById('resultsLoadingScreen') as HTMLSelectElement;

  resultsLoadingScreen.classList.add('hidden');
  resultsTableContainer.classList.remove('hidden');
  window.scrollTo({
    top: resultsContainer.offsetTop - 70,
    behavior: 'smooth',
  });
}



function clearAndCancelQuery(editorAndLanguageClient: EditorAndLanguageClient) {
  // TODO: cancel query
  editorAndLanguageClient.editorApp.getEditor()!.setValue('');
}


function setupStats() {
  document.getElementById('resultSize')!.innerText = "?";
  document.getElementById('queryTimeTotal')!.innerText = "...";
  // document.getElementById('queryTimeCompute')!.innerText = response.time.computeResult.toLocaleString("en-US");
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
