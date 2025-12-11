import type { EditorAndLanguageClient } from "../types/monaco";
import type { SPARQLResults } from "../types/rdf";

export async function renderResultsTable(editorAndLanguageClient: EditorAndLanguageClient, response: SPARQLResults) {
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

  // NOTE: Show "Map view" button if the last column contains a WKT string.
  const mapViewButton = document.getElementById("mapViewButton") as HTMLAnchorElement;
  const n_cols = response.head.vars.length;
  const n_rows = response.results.bindings.length;
  const last_col_var = response.head.vars[response.head.vars.length - 1];
  if (n_rows > 0 && last_col_var in response.results.bindings[0]) {
    const binding = response.results.bindings[0][last_col_var];
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
  td.classList.add('p-2', 'truncate');
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
        td.classList.add('hover:text-blue-400', 'cursor-pointer');
        td.onclick = () => {
          navigator.clipboard.writeText(value.value);
          document.dispatchEvent(
            new CustomEvent('toast', {
              detail: { type: 'success', message: 'Copied to clipboard!', duration: 3000 },
            })
          );
        };
        td.textContent =
          value.value.length > 200 ? value.value.substring(0, 200) + '...' : value.value;
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

