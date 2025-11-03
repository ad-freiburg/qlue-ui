import type { BackendManager } from './backend/backends';
import type { EditorAndLanguageClient } from './types/monaco';
import type { BindingValue, SPARQLResults } from './types/rdf';

export async function setupResults(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById('ExecuteButton')! as HTMLButtonElement;
  setupInfiniteScroll(editorAndLanguageClient);
  executeButton.addEventListener('click', async () => {
    executeQueryAndShowResults(editorAndLanguageClient);
  });
}

export async function executeQueryAndShowResults(editorAndLanguageClient: EditorAndLanguageClient) {

  const resultsContainer = document.getElementById('results') as HTMLSelectElement;
  const resultsTableContainer = document.getElementById('resultsTableContainer') as HTMLSelectElement;
  const resultsLoadingScreen = document.getElementById('resultsLoadingScreen') as HTMLSelectElement;
  const resultsError = document.getElementById('resultsError') as HTMLSelectElement;
  document.dispatchEvent(new Event("infinite-reset"));

  resultsTableContainer.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  resultsLoadingScreen.classList.remove('hidden');
  resultsError.classList.add('hidden');
  executeQuery(editorAndLanguageClient)
    .then((result) => {
      // showQueryStats(result);
      renderResults(result);
      resultsLoadingScreen.classList.add('hidden');
      resultsTableContainer.classList.remove('hidden');
      window.scrollTo({
        top: resultsContainer.offsetTop - 70,
        behavior: 'smooth',
      });
    })
    .catch((err) => { });
}

async function executeQuery(
  editorAndLanguageClient: EditorAndLanguageClient,
  limit: number = 100,
  offset: number = 0
): Promise<SPARQLResults> {
  let response = (await editorAndLanguageClient.languageClient
    .sendRequest('qlueLs/executeQuery', {
      textDocument: {
        uri: editorAndLanguageClient.editorApp.getEditor()!.getModel()!.uri.toString(),
      },
      maxResultSize: limit,
      resultOffset: offset,
    })
    .catch((err) => {
      const resultsErrorMessage = document.getElementById('resultErrorMessage')! as HTMLSpanElement;
      const resultsErrorQuery = document.getElementById('resultsErrorQuery')! as HTMLPreElement;
      if (err.data) {
        console.log(err.data);
        switch (err.data.type) {
          case 'QLeverException':
            resultsErrorMessage.textContent = err.data.exception;
            resultsErrorQuery.innerHTML =
              err.data.query.substring(0, err.data.metadata.startIndex) +
              `<span class="text-red-500 dark:text-red-600 font-bold">${err.data.query.substring(err.data.metadata.startIndex, err.data.metadata.stopIndex + 1)}</span>` +
              err.data.query.substring(err.data.metadata.stopIndex + 1);
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
    })) as SPARQLResults;
  if (response.results.bindings.length < 100) {
    document.dispatchEvent(new Event("infinite-stop"));
  }
  return response;
}

function showQueryStats(response: SPARQLResults) {
  // document.getElementById('resultSize')!.innerText = `${response.resultSizeTotal}`;
  // document.getElementById('queryTimeTotal')!.innerText = `${response.time.total}`;
  // document.getElementById('queryTimeCompute')!.innerText = `${response.time.compute}`;
  // document.getElementById('queryTimeSendAndReceive')!.innerText = `??`;
}

function renderResults(response: SPARQLResults) {
  const resultTable = document.getElementById('resultsTable') as HTMLTableElement;
  resultTable.innerText = '';

  // NOTE: Use document fragment to batch DOM updates.
  const fragment = document.createDocumentFragment();

  // NOTE: Header row, containing the selected variables.
  const headerRow = document.createElement('tr');
  headerRow.classList = 'border-b-2 border-gray-300 dark:border-b-gray-600 text-green-600';

  const thIndex = document.createElement('th');
  thIndex.textContent = '#';
  thIndex.className = 'text-left p-2 w-10';
  headerRow.appendChild(thIndex);

  for (let selectedVar of response.head.vars) {
    const th = document.createElement('th');
    th.textContent = selectedVar;
    th.className = 'text-left p-2';
    headerRow.appendChild(th);
  }

  fragment.appendChild(headerRow);
  resultTable.appendChild(fragment);
  const rows = renderTableRows(response);
  resultTable.appendChild(rows);
}

function renderTableRows(result: SPARQLResults, offset: number = 0): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let index = 1 + offset;
  const results = result.results;
  for (const binding of results.bindings) {
    const tr = document.createElement('tr');
    tr.classList =
      'dark:even:bg-[#1F1F26] not-dark:odd:bg-neutral-50 border-b border-b-gray-300 dark:border-b-gray-600';
    const td = document.createElement('td');
    td.textContent = `${index}`;
    td.className = 'p-2 text-neutral-400';
    tr.appendChild(td);
    for (const variable of result.head.vars) {
      const element = renderValue(binding[variable]);
      tr.appendChild(element);
    }
    fragment.appendChild(tr);
    index++;
  }
  return fragment;
}

function renderValue(value: BindingValue | undefined): HTMLElement {
  const td = document.createElement('td');
  td.className = 'p-2 truncate';
  if (value != undefined) {
    switch (value.type) {
      case 'uri':
        const link = document.createElement('a');
        link.href = value.value;
        link.textContent = value.curie ? value.curie : value.value;
        link.className = 'text-blue-600 dark:text-blue-400 hover:underline';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        td.appendChild(link);
        break;
      case 'literal':
        td.textContent = value.value;
        if (value['xml:lang']) {
          const langSpan = document.createElement('span');
          langSpan.textContent = ` @${value['xml:lang']}`;
          langSpan.className = 'text-gray-500 dark:text-gray-400 text-sm';
          td.appendChild(langSpan);
        }
        if (value.datatype) {
          const datatypeSpan = document.createElement('span');
          datatypeSpan.textContent = ` (${getShortDatatype(value.datatype!)})`;
          datatypeSpan.className = 'text-gray-500 dark:text-gray-400 text-sm';
          td.appendChild(datatypeSpan);
        }
        break;
    }
  }
  return td;
}

function getShortDatatype(datatype: string): string {
  // Convert full XSD URIs to short forms
  const xsdPrefix = 'http://www.w3.org/2001/XMLSchema#';
  if (datatype.startsWith(xsdPrefix)) {
    return 'xsd:' + datatype.slice(xsdPrefix.length);
  }

  // Extract last part after # or /
  const match = datatype.match(/[#/]([^#/]+)$/);
  return match ? match[1] : datatype;
}

function clearAndCancelQuery(editorAndLanguageClient: EditorAndLanguageClient) {
  // TODO: cancel query
  editorAndLanguageClient.editorApp.getEditor()!.setValue('');
}

function setupInfiniteScroll(editorAndLanguageClient: EditorAndLanguageClient) {
  const window_size = 100;
  let offset = window_size;
  let mutex = false;
  let done = false;
  const resultReloadingAnimation = document.getElementById("resultReloadingAnimation")!;

  async function onScroll() {
    if (mutex || done) return;
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.body.offsetHeight;
    if (scrollPosition >= pageHeight - 1000) {
      resultReloadingAnimation.classList.remove("hidden");
      mutex = true;
      const results = await executeQuery(editorAndLanguageClient, window_size, offset);
      const resultsTable = document.getElementById('resultsTable')! as HTMLTableElement;
      const rows = renderTableRows(results, offset);
      resultsTable.appendChild(rows);
      resultReloadingAnimation.classList.add("hidden");
      offset += window_size;
      mutex = false;
    }
  }

  function stopReload() {
    done = true;
  }

  function reset() {
    offset = window_size;
    mutex = false;
    done = false;
  }

  document.addEventListener('scroll', onScroll);
  document.addEventListener("infinite-reset", () => {
    reset();
  });
  document.addEventListener("infinite-stop", stopReload);
}
