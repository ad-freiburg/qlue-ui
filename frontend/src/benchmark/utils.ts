interface ProcessResult<T = any> {
  result: T | null;
  timeMs: number;
  error?: any;
}

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

export type AsyncProcess<T = any> = (index: number) => Promise<T>;

export function startProcesses<T>(
  processes: AsyncProcess<T>[],
  onProcessDone: (res: ProcessResult<T>) => void
): void {
  processes.forEach((processFunc, index) => {
    const start = performance.now();

    processFunc(index)
      .then(result => {
        const end = performance.now();
        const timeMs = end - start;
        onProcessDone({ index, result, timeMs });
      })
      .catch(error => {
        const end = performance.now();
        const timeMs = end - start;
        onProcessDone({ index, result: null, timeMs, error });
      });
  });
}

export const exampleProcess: AsyncProcess<string> = async (id: number) => {
  const duration = Math.random() * 60_000;
  return new Promise((resolve, reject) => setTimeout(() => {
    if (Math.random() > 0.5) {
      reject(new Error())
      return
    }
    resolve(`Process ${id} done`);
  }, duration)
  )
};

