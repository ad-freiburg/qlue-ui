// NOTE: This is the "result" module.
// It's task is executing a SPARQL operation and display the results.
// Query execution can be triggered from 4 locations:
// - from the execute button
// - from the editor via the CTRL + Enter keybinding
// - from the url-searchparam: "?exec=true"
// - from the analysis modal: "clear cache & rerun query"
// There MUST always be at most one query in exection!
// To handle this there are 4 signals, send over the "window":
// - "execute-start-request"  : requests the execution
// - "execute-started"        : execution has started
// - "execute-cancle-request" : request cancelation of the currently executed op
// - "execute-ended"          : execution has ended
// Who ever wants to execute a new query has to request the cancelation of the
// current query and wait for it to end. Only then will a new query be executed.

import type { Service } from '../types/backend';
import type { ExecuteQueryResult, Head, PartialResult } from '../types/lsp_messages';
import type { EditorAndLanguageClient } from '../types/monaco';
import type { QueryExecutionTree } from '../types/query_execution_tree';
import type { Binding } from '../types/rdf';
import { renderTableHeader, renderTableRows } from './table';
import {
  clearQueryStats,
  type QueryStatus,
  scrollToResults,
  setShareLink,
  showLoadingScreen,
  showQueryMetaData,
  showResults,
  startQueryTimer,
  stopQueryTimer,
  toggleExecuteCancelButton
} from './utils';

export interface ExecuteQueryEventDetails {
  queryId: string
}

export interface ExecuteQueryEndEventDetails {
  queryExecutionTree: QueryExecutionTree
}

export interface QueryResultSizeDetails {
  size: number
}

let queryStatus: QueryStatus = "idle";

export async function setupResults(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById('executeButton')! as HTMLButtonElement;
  executeButton.addEventListener('click', () => {
    if (queryStatus == "running") {
      window.dispatchEvent(new Event("execute-cancle-request"));
    }
    else if (queryStatus == "idle") {
      window.dispatchEvent(new Event("execute-start-request"));
    }
  });
  handleSignals(editorAndLanguageClient)
}

function handleSignals(editorAndLanguageClient: EditorAndLanguageClient) {
  window.addEventListener("execute-start-request", () => {
    if (queryStatus == "idle") {
      queryStatus = "running";
      executeQueryAndShowResults(editorAndLanguageClient);
    } else {
      document.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'warning', message: 'There already a query in execution', duration: 2000
          },
        })
      );
    }
  });
  window.addEventListener("execute-cancle-request", () => {
    queryStatus = "canceling";
    toggleExecuteCancelButton(queryStatus);
  });
  window.addEventListener("execute-query", () => {
    toggleExecuteCancelButton(queryStatus);
  });
  window.addEventListener("execute-ended", () => {
    queryStatus = "idle";
    toggleExecuteCancelButton(queryStatus);
  });

}

async function executeQueryAndShowResults(editorAndLanguageClient: EditorAndLanguageClient) {
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
    window.dispatchEvent(new CustomEvent("execute-ended"));
  }).catch(() => {
    stopQueryTimer(timer);
    window.dispatchEvent(new CustomEvent("execute-ended"));
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

  window.addEventListener("execute-cancle-request", () => {
    editorAndLanguageClient.languageClient.sendRequest("qlueLs/cancelQuery", {
      queryId
    })
      .catch(err => {
        console.error("The query cancelation failed:", err);
        document.dispatchEvent(
          new CustomEvent('toast', {
            detail: { type: 'error', message: 'Query could not be canceled', duration: 2000 },
          })
        );
      })
  });

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
          case 'Canceled':
            resultsErrorMessage.innerHTML = `Operation was manually cancelled.`;
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
        top: resultsError.offsetTop + 10,
        behavior: 'smooth',
      });
      throw new Error('Query processing error');
    })) as ExecuteQueryResult;
  return response.timeMs
}

function renderLazyResults(editorAndLanguageClient: EditorAndLanguageClient) {
  let head: Head | undefined;
  let first_bindings = true;
  // NOTE: For a lazy sparql query, the languag server will send "qlueLs/partialResult"
  // notifications. These contain a partial result.
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
  // NOTE: QLever sends runtime-information over a websocket.
  // It contains information about the result size.
  const sizeEl = document.getElementById('resultSize')!;
  sizeEl.classList.remove("normal-nums");
  sizeEl.classList.add("tabular-nums");
  window.addEventListener("query-result-size", (event) => {
    const { size } = (event as CustomEvent<QueryResultSizeDetails>).detail;
    document.getElementById('resultSize')!.innerText = size.toLocaleString("en-US");
  });
}

// Show "Map view" button if the last column contains a WKT string.
async function showMapViewButton(editorAndLanguageClient: EditorAndLanguageClient, head: Head, bindings: Binding[]) {
  const mapViewButton = document.getElementById("mapViewButton") as HTMLAnchorElement;
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
