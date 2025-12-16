import type { Service } from '../types/backend';
import type { ExecuteQueryResult, Head, PartialResult } from '../types/lsp_messages';
import type { EditorAndLanguageClient } from '../types/monaco';
import type { QueryExecutionTree } from '../types/query_execution_tree';
import type { Binding, SPARQLResults } from '../types/rdf';
import { renderTableHeader, renderTableRows } from './table';
import { clearAndCancelQuery, clearQueryStats, scrollToResults, setShareLink, showLoadingScreen, showQueryMetaData, showResults, startQueryTimer, stopQueryTimer, toggleExecuteCancelButton } from './utils';


export interface ExecuteQueryEventDetails {
  queryId: string
}

export interface ExecuteQueryEndEventDetails {
  queryExecutionTree: QueryExecutionTree
}

export async function setupResults(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById('ExecuteButton')! as HTMLButtonElement;
  executeButton.addEventListener('click', async () => {
    if (executeButton.firstElementChild!.classList.contains("hidden")) {
      clearAndCancelQuery(editorAndLanguageClient);
    }
    else {
      executeQueryAndShowResults(editorAndLanguageClient);
    }
  });
  window.addEventListener("execute-query", toggleExecuteCancelButton);
  window.addEventListener("execute-query-end", toggleExecuteCancelButton);
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
  // NOTE: Clear the UI from previous executions
  clearQueryStats();
  // NOTE: Get ShareLink and update URL
  setShareLink(editorAndLanguageClient, backend);
  // NOTE: Start query timer.
  const timer = startQueryTimer();
  executeQuery(editorAndLanguageClient, 100, 0).then(timeMs => {
    showResults();
    stopQueryTimer(timer);
    document.getElementById('queryTimeTotal')!.innerText = timeMs.toLocaleString("en-US") + "ms";
    window.dispatchEvent(new CustomEvent("execute-query-end"));
  }).catch(err => {
    stopQueryTimer(timer);
    console.log(err);
  });
  renderLazyResults(editorAndLanguageClient);
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

function renderLazyResults(editorAndLanguageClient: EditorAndLanguageClient) {
  let head: Head | undefined;
  let first_bindings = true;
  editorAndLanguageClient.languageClient.onNotification("qlueLs/partialResult", (partialResult: PartialResult) => {
    if ("header" in partialResult) {
      head = partialResult.header.head;
      renderTableHeader(head);
      showResults();
    }
    else if ("meta" in partialResult) {
      showQueryMetaData(partialResult.meta);
    }
    else {
      renderTableRows(head!, partialResult.bindings)
      if (first_bindings) {
        showMapViewButton(editorAndLanguageClient, head!, partialResult.bindings);
        scrollToResults();
        first_bindings = false;
      }
    }
  });
}

// Show "Map view" button if the last column contains a WKT string.
async function showMapViewButton(editorAndLanguageClient: EditorAndLanguageClient, head: Head, bindings: Binding[]) {
  const mapViewButton = document.getElementById("mapViewButton") as HTMLAnchorElement;
  const n_cols = head.vars.length;
  const n_rows = bindings.length;
  const last_col_var = head.vars[head.vars.length - 1];
  if (n_rows > 0 && last_col_var in bindings[0]) {
    const binding = bindings[0][last_col_var];
    if (binding.type == "literal" && binding.datatype === "http://www.opengis.net/ont/geosparql#wktLiteral") {
      mapViewButton?.classList.remove("hidden");
      const query: string = editorAndLanguageClient.editorApp.getEditor()!.getValue()!;
      const backend = await editorAndLanguageClient.languageClient.sendRequest("qlueLs/getBackend", {}) as Service;
      mapViewButton?.addEventListener("click", () => {
        const params = {
          query: query,
          backend: backend.url
        };
        mapViewButton.href = `https://qlever.dev/petrimaps/?${new URLSearchParams(params)}`
      })
    }
  }
}
