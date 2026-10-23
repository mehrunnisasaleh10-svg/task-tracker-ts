export type SearchOptions = Readonly<{ debounceMs: number }>;

export function createSearch<T>(
  fetchFn: (query: string, signal: AbortSignal) => Promise<T>,
  options: SearchOptions,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let sequence = 0;

  return {
    search(query: string, onResult: (value: T) => void, onError?: (error: unknown) => void): void {
      sequence += 1;
      const thisSequence = sequence;
      if (timer !== undefined) clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const activeController = controller;
      timer = setTimeout(() => {
        void fetchFn(query, activeController.signal)
          .then((result) => {
            if (thisSequence === sequence && !activeController.signal.aborted) onResult(result);
          })
          .catch((error: unknown) => {
            if (thisSequence === sequence && !activeController.signal.aborted) onError?.(error);
          });
      }, options.debounceMs);
    },
    cancel(): void {
      sequence += 1;
      if (timer !== undefined) clearTimeout(timer);
      controller?.abort();
    },
  };
}
