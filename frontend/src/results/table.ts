import { settings } from "../settings/init";
import type { Head } from "../types/lsp_messages";
import type { Binding, BindingValue } from "../types/rdf";

export async function renderTableHeader(head: Head) {

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

  for (let selectedVar of head.vars) {
    const th = document.createElement('th');
    th.textContent = selectedVar;
    th.className = 'text-left p-2';
    headerRow.appendChild(th);
  }

  fragment.appendChild(headerRow);
  resultTable.appendChild(fragment);
}

export function renderTableRows(head: Head, bindings: Binding[], offset: number = 0) {
  const resultTable = document.getElementById('resultsTable') as HTMLTableElement;
  const fragment = document.createDocumentFragment();
  let index = 1 + offset;
  for (const binding of bindings) {
    const tr = document.createElement('tr');
    tr.classList =
      'dark:even:bg-[#1F1F26] not-dark:odd:bg-neutral-50 border-b border-b-gray-300 dark:border-b-gray-600';
    const td = document.createElement('td');
    td.textContent = `${index}`;
    td.className = 'p-2 text-neutral-400';
    tr.appendChild(td);
    for (const variable of head.vars) {
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
        td.title = value.value;
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
        if (value.datatype === "http://www.w3.org/2001/XMLSchema#decimal" && isNumericString(value.value)) {
          td.textContent = parseFloat(value.value).toLocaleString("en-US");
        }
        else {
          td.textContent =
            value.value.length > 200 ? value.value.substring(0, 200) + '...' : value.value;
        }
        td.title = td.textContent;

        if (value['xml:lang']) {
          const langSpan = document.createElement('span');
          langSpan.textContent = ` @${value['xml:lang']}`;
          langSpan.className = 'lang-tag text-gray-500 dark:text-gray-400 text-sm';
          if (!settings.results.langAnnotations) {
            langSpan.classList.add("hidden");
          }
          td.appendChild(langSpan);
        }
        if (value.datatype) {
          const datatypeSpan = document.createElement('span');
          datatypeSpan.textContent = ` (${getShortDatatype(value.datatype!)})`;
          datatypeSpan.className = 'type-tag text-gray-500 dark:text-gray-400 text-sm';
          if (!settings.results.typeAnnotations) {
            datatypeSpan.classList.add("hidden");
          }
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

function isNumericString(str: string): boolean {
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

