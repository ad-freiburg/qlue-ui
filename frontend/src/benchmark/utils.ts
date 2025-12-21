interface ProcessResult<T = any> {
  index: number;
  result: T | null;
  timeMs: number | null;
  error?: any;
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
  const duration = Math.random() * 20000;
  return new Promise(resolve => setTimeout(() => resolve(`Process ${id} done`), duration));
};

