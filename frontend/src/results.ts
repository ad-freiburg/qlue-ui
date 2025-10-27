import type { EditorAndLanguageClient } from "./types/monaco";
import type { SparqlResults, QleverResponse, RdfValue } from "./types/rdf";

export async function setupResults(editorAndLanguageClient: EditorAndLanguageClient) {
  executeQueryAndShowResults(editorAndLanguageClient);
  const executeButton = document.getElementById("ExecuteButton")! as HTMLButtonElement;
  // NOTE: Execute button
  executeButton.addEventListener('click', async () => {
    executeQueryAndShowResults(editorAndLanguageClient);
  });
}

async function executeQueryAndShowResults(editorAndLanguageClient: EditorAndLanguageClient) {
  const query = editorAndLanguageClient.editorApp.getEditor()!.getModel()!.getValue();
  const result = await executeQuery(query);
  showQueryStats(result);
  showResults(result);
}

async function executeQuery(query): Promise<QleverResponse> {
  return await fetch(
    `https://qlever.dev/api/osm-planet?query=${encodeURIComponent(query)}`,
    {
      headers: {
        "Accept": "application/qlever-results+json"
      }
    }
  ).then(response => {
    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }) as QleverResponse;
}

function showQueryStats(response: QleverResponse) {
  document.getElementById("resultSize")!.innerText = `${response.resultSizeTotal}`;
  document.getElementById("queryTimeTotal")!.innerText = `${response.time.total}`;
  document.getElementById("queryTimeCompute")!.innerText = `${response.time.computeResult}`;
  document.getElementById("queryTimeSendAndReceive")!.innerText = `??`;
}

function showResults(response: QleverResponse) {
  const resultTable = document.getElementById("resultTable") as HTMLTableElement;
  resultTable.innerText = "";

  // NOTE: Use document fragment to batch DOM updates.
  const fragment = document.createDocumentFragment();

  //NOTE: Header row, containing the selected variables.
  const headerRow = document.createElement("tr");
  headerRow.classList = "border-b-2 border-gray-300 dark:border-b-gray-600 text-green-600";

  const thIndex = document.createElement("th");
  thIndex.textContent = "#";
  thIndex.className = "text-left p-2 w-10";
  headerRow.appendChild(thIndex);

  for (let selectedVar of response.selected) {
    const th = document.createElement("th");
    th.textContent = selectedVar;
    th.className = "text-left p-2";
    headerRow.appendChild(th);
  }

  fragment.appendChild(headerRow);

  // NOTE: Result rows.
  let index = 1;
  const results = response.res;
  for (const row of results) {
    const tr = document.createElement("tr");
    tr.classList = "dark:even:bg-neutral-800 not-dark:odd:bg-neutral-50 border-b border-b-gray-300 dark:border-b-gray-600";
    const td = document.createElement("td");
    td.textContent = `${index}`;
    td.className = "p-2 text-neutral-400";
    tr.appendChild(td);
    for (const value of row) {
      const element = renderValue(value);
      tr.appendChild(element);
    }
    fragment.appendChild(tr);
    index++;
  }
  resultTable.appendChild(fragment);
}

function renderValue(value: string): HTMLElement {
  const rdfValue = parseRdfValue(value);
  const td = document.createElement("td");
  td.className = "p-2 truncate";
  switch (rdfValue.type) {
    case 'literal':
      td.textContent = rdfValue.value;
      if (rdfValue.language) {
        const langSpan = document.createElement('span');
        langSpan.textContent = ` @${rdfValue.language}`;
        langSpan.className = 'text-gray-500 dark:text-gray-400 text-sm';
        td.appendChild(langSpan);
      }
      break;
    case 'typed-literal':
      const valueSpan = document.createElement('span');
      valueSpan.textContent = rdfValue.value;

      const datatypeSpan = document.createElement('span');
      datatypeSpan.textContent = ` (${getShortDatatype(rdfValue.datatype!)})`;
      datatypeSpan.className = 'text-gray-500 dark:text-gray-400 text-sm';

      td.appendChild(valueSpan);
      td.appendChild(datatypeSpan);
      break;

      break;
    case 'iri':
      const link = document.createElement('a');
      link.href = rdfValue.value;
      link.textContent = rdfValue.value;
      link.className = 'text-blue-600 dark:text-blue-400 hover:underline';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      td.appendChild(link);
      break;
  }
  return td
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

function parseRdfValue(rdfString: string): RdfValue {
  // IRI: <http://example.org>
  if (rdfString.startsWith('<') && rdfString.endsWith('>')) {
    return {
      type: 'iri',
      value: rdfString.slice(1, -1)
    };
  }

  // Typed literal: "42"^^<http://www.w3.org/2001/XMLSchema#int>
  const typedLiteralMatch = rdfString.match(/^"(.*)"\^\^<(.+)>$/);
  if (typedLiteralMatch) {
    return {
      type: 'typed-literal',
      value: typedLiteralMatch[1],
      datatype: typedLiteralMatch[2]
    };
  }

  // Language-tagged literal: "Hello"@en
  const langLiteralMatch = rdfString.match(/^"(.*)"@(\w+)$/);
  if (langLiteralMatch) {
    return {
      type: 'literal',
      value: langLiteralMatch[1],
      language: langLiteralMatch[2]
    };
  }

  // Plain string literal: "text"
  if (rdfString.startsWith('"') && rdfString.endsWith('"')) {
    return {
      type: 'literal',
      value: rdfString.slice(1, -1)
    };
  }

  // Fallback
  return {
    type: 'literal',
    value: rdfString
  };
}
