import type { SparqlRequest } from "./types";

interface QueryResult {
  index: number;
  resultSize: number | null;
  timeMs: number;
  error?: any;
}

export function startQueries(requests: SparqlRequest[], onProcessDone: (res: QueryResult) => void): void {
  requests.forEach((request, index) => {
    const start = performance.now();
    fetch(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/sparql-query",
        "Accept": "application/sparql-results+json",
      },
      body: request.query
    }
    )
      .then(result => {
        const end = performance.now();
        const timeMs = end - start;
        if (result.ok) {
          onProcessDone({ index, resultSize: 42, timeMs });
        } else {
          onProcessDone({ index, resultSize: null, timeMs, error: result.statusText });
        }
      })
      .catch(error => {
        const end = performance.now();
        const timeMs = end - start;
        onProcessDone({ index, resultSize: null, timeMs, error });
      });
  })
}
