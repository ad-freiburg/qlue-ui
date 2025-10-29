import type { BackendManager } from './backend/backends';
import type { EditorAndLanguageClient } from './types/monaco';
import type { BindingValue, SPARQLResults } from './types/rdf';

export async function setupResults(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById('ExecuteButton')! as HTMLButtonElement;
  const backendSelector = document.getElementById('backendSelector') as HTMLSelectElement;
  const results = document.getElementById('results') as HTMLSelectElement;
  // NOTE: Execute button
  executeButton.addEventListener('click', async () => {
    executeQueryAndShowResults(editorAndLanguageClient);
  });
}

export async function executeQueryAndShowResults(editorAndLanguageClient: EditorAndLanguageClient) {
  const resultsContainer = document.getElementById('results') as HTMLSelectElement;
  const resultsTable = document.getElementById('resultsTable') as HTMLSelectElement;
  const resultsLoadingScreen = document.getElementById('resultsLoadingScreen') as HTMLSelectElement;

  resultsTable.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  resultsLoadingScreen.classList.remove('hidden');
  const query = editorAndLanguageClient.editorApp.getEditor()!.getModel()!.getValue();
  const result = await executeQuery(query, editorAndLanguageClient);
  // showQueryStats(result);
  renderResults(result);
  resultsLoadingScreen.classList.add('hidden');
  resultsTable.classList.remove('hidden');
  window.scrollTo({
    top: resultsContainer.offsetTop - 20,
    behavior: 'smooth',
  });
}

async function executeQuery(
  query: string,
  editorAndLanguageClient: EditorAndLanguageClient
): Promise<SPARQLResults> {
  let response = (await editorAndLanguageClient.languageClient
    .sendRequest('qlueLs/executeQuery', {
      textDocument: {
        uri: editorAndLanguageClient.editorApp.getEditor()!.getModel()!.uri.toString(),
        send: 100,
      },
    })
    .catch((err) => {
      console.error(err);
    })) as SPARQLResults;
  console.log(response);
  return response;
}

function showQueryStats(response: SPARQLResults) {
  // document.getElementById('resultSize')!.innerText = `${response.resultSizeTotal}`;
  // document.getElementById('queryTimeTotal')!.innerText = `${response.time.total}`;
  // document.getElementById('queryTimeCompute')!.innerText = `${response.time.compute}`;
  // document.getElementById('queryTimeSendAndReceive')!.innerText = `??`;
}

function renderResults(response: SPARQLResults) {
  const resultTable = document.getElementById('resultTable') as HTMLTableElement;
  resultTable.innerText = '';

  // NOTE: Use document fragment to batch DOM updates.
  const fragment = document.createDocumentFragment();

  //NOTE: Header row, containing the selected variables.
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

  // NOTE: Result rows.
  let index = 1;
  const results = response.results;
  for (const binding of results.bindings) {
    const tr = document.createElement('tr');
    tr.classList =
      'dark:even:bg-neutral-800 not-dark:odd:bg-neutral-50 border-b border-b-gray-300 dark:border-b-gray-600';
    const td = document.createElement('td');
    td.textContent = `${index}`;
    td.className = 'p-2 text-neutral-400';
    tr.appendChild(td);
    for (const variable of response.head.vars) {
      const element = renderValue(binding[variable]);
      tr.appendChild(element);
    }
    fragment.appendChild(tr);
    index++;
  }
  resultTable.appendChild(fragment);
}

function renderValue(value: BindingValue | undefined): HTMLElement {
  const td = document.createElement('td');
  td.className = 'p-2 truncate';
  console.log(value);
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
