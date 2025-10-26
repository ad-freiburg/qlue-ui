import type { EditorAndLanguageClient } from "./types/monaco";
import type { SparqlResults } from "./types/rdf";

export async function setup_results(editorAndLanguageClient: EditorAndLanguageClient) {
  const executeButton = document.getElementById("ExecuteButton");
  // NOTE: Execute button
  document.getElementById('ExecuteButton')!.addEventListener('click', async () => {
    const query = editorAndLanguageClient.editorApp.getEditor()!.getModel()!.getValue();
    const result = await fetch(
      `https://qlever.dev/api/osm-planet?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Accept": "application/sparql-results+json"
        }
      }
    ).then(response => {
      if (!response.ok) {
        throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
      }
      return response.json();
    }) as SparqlResults;
    document.getElementById("resultSize")!.innerText = `${result.results.bindings.length} `;
    const resultTable = document.getElementById("resultTable") as HTMLTableElement;
    resultTable.innerText = "";
    console.log(result)
    const headerRow = document.createElement("tr");
    headerRow.classList = "border-b-2 border-gray-300 dark:border-b-gray-600";

    const th = document.createElement("th");
    th.textContent = "#";
    th.className = "text-left p-2 w-10";
    headerRow.appendChild(th);
    let vars = result.head.vars;
    for (let v of vars) {
      const th = document.createElement("th");
      th.textContent = `?${v}`;
      th.className = "text-left p-2";
      headerRow.appendChild(th);
    }
    resultTable.appendChild(headerRow);
    const bindings = result.results.bindings;
    for (const [index, binding] of bindings.slice(0, 100).entries()) {
      const tr = document.createElement("tr");
      tr.classList = "dark:even:bg-neutral-800 not-dark:odd:bg-neutral-50 border-b border-b-gray-300 dark:border-b-gray-600";
      const td = document.createElement("td");
      td.textContent = `${index + 1}`;
      td.className = "p-2 text-neutral-400";
      tr.appendChild(td);
      for (const [key, value] of Object.entries(binding)) {
        const td = document.createElement("td");
        td.textContent = value.value;
        td.className = "p-2 truncate";
        tr.appendChild(td);
      }
      resultTable.appendChild(tr);
    }
  });
}
