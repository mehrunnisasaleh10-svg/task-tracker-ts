import type { AsyncState, Task } from "./types";

export type RandomFn = () => number;
export type FetchOutcome = "success" | "empty" | "network-error" | "validation-error";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}
export class TimeoutError extends Error {
  constructor(message = "Request timed out.") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function abortError(): DOMException {
  return new DOMException("Request aborted", "AbortError");
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function simulatedFetch(
  tasks: readonly Task[],
  options: {
    random?: RandomFn;
    maxDelayMs?: number;
    outcome?: FetchOutcome;
    signal?: AbortSignal;
  } = {},
): Promise<Task[]> {
  const random = options.random ?? Math.random;
  const maxDelay = options.maxDelayMs ?? 100;
  await wait(Math.floor(random() * (maxDelay + 1)), options.signal);
  switch (options.outcome ?? "success") {
    case "success":
      return [...tasks];
    case "empty":
      return [];
    case "network-error":
      throw new NetworkError("Simulated network failure.");
    case "validation-error":
      throw new ValidationError("Simulated data validation failure.");
  }
}

export async function retry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    signal?: AbortSignal;
    attempts?: number;
    timeoutMs?: number;
    random?: RandomFn;
    baseDelayMs?: number;
  } = {},
): Promise<T> {
  const attempts = Math.min(3, Math.max(1, options.attempts ?? 3));
  const timeoutMs = options.timeoutMs ?? 2000;
  const random = options.random ?? Math.random;
  const baseDelayMs = options.baseDelayMs ?? 100;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (options.signal?.aborted) throw abortError();
    const controller = new AbortController();
    const relayAbort = (): void => controller.abort();
    options.signal?.addEventListener("abort", relayAbort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rejectExternalAbort: (() => void) | undefined;
    const externalAbort = new Promise<never>((_, reject) => {
      rejectExternalAbort = () => reject(abortError());
      options.signal?.addEventListener("abort", rejectExternalAbort, { once: true });
    });
    try {
      return await Promise.race([
        operation(controller.signal),
        externalAbort,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new TimeoutError());
          }, timeoutMs);
        }),
      ]);
    } catch (error: unknown) {
      if (options.signal?.aborted || (error instanceof DOMException && error.name === "AbortError"))
        throw error;
      if (error instanceof ValidationError || attempt === attempts - 1) throw error;
      const delay = Math.floor(baseDelayMs * 2 ** attempt * (0.5 + random()));
      await wait(delay, options.signal);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      options.signal?.removeEventListener("abort", relayAbort);
      if (rejectExternalAbort) options.signal?.removeEventListener("abort", rejectExternalAbort);
    }
  }
  throw new NetworkError("Retry attempts exhausted.");
}

export class LatestRequest<T> {
  private requestId = 0;
  private controller: AbortController | undefined;

  async run(
    operation: (signal: AbortSignal) => Promise<T>,
    commit: (value: T) => void,
  ): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const id = ++this.requestId;
    try {
      const value = await operation(controller.signal);
      if (id === this.requestId && !controller.signal.aborted) commit(value);
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }
  cancel(): void {
    this.controller?.abort();
  }
}

export function toAsyncState(tasks: readonly Task[]): AsyncState<Task[]> {
  return tasks.length === 0 ? { status: "empty" } : { status: "success", data: [...tasks] };
}
