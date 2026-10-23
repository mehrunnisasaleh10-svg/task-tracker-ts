import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LatestRequest,
  NetworkError,
  TimeoutError,
  ValidationError,
  abortError,
  retry,
  simulatedFetch,
  toAsyncState,
} from "../src/fetcher";
import { task } from "./helpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("simulatedFetch", () => {
  it("returns tasks for success and an empty array for empty outcome", async () => {
    expect(
      await simulatedFetch([task("a")], {
        random: () => 0,
        outcome: "success",
      }),
    ).toHaveLength(1);

    expect(
      await simulatedFetch([task("a")], {
        random: () => 0,
        outcome: "empty",
      }),
    ).toEqual([]);
  });

  it("throws the configured network and validation errors", async () => {
    await expect(
      simulatedFetch([], { random: () => 0, outcome: "network-error" }),
    ).rejects.toBeInstanceOf(NetworkError);

    await expect(
      simulatedFetch([], { random: () => 0, outcome: "validation-error" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("supports an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      simulatedFetch([task("a")], {
        random: () => 0,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("retry", () => {
  it("retries network errors and eventually succeeds", async () => {
    let calls = 0;

    const result = await retry(
      async () => {
        calls += 1;
        if (calls < 3) throw new NetworkError("temporary");
        return "ok";
      },
      { random: () => 0, baseDelayMs: 1, timeoutMs: 100 },
    );

    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry validation errors", async () => {
    let calls = 0;

    await expect(
      retry(
        async () => {
          calls += 1;
          throw new ValidationError("bad data");
        },
        { baseDelayMs: 1 },
      ),
    ).rejects.toThrow("bad data");

    expect(calls).toBe(1);
  });

  it("stops after three attempts by default", async () => {
    let calls = 0;

    await expect(
      retry(
        async () => {
          calls += 1;
          throw new NetworkError("offline");
        },
        { baseDelayMs: 1 },
      ),
    ).rejects.toThrow("offline");

    expect(calls).toBe(3);
  });

  it("honours the configured attempt limit", async () => {
    let calls = 0;

    await expect(
      retry(
        async () => {
          calls += 1;
          throw new NetworkError("offline");
        },
        { attempts: 1, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("offline");

    expect(calls).toBe(1);
  });

  it("does not exceed three attempts when a larger limit is requested", async () => {
    let calls = 0;

    await expect(
      retry(
        async () => {
          calls += 1;
          throw new NetworkError("offline");
        },
        { attempts: 10, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("offline");

    expect(calls).toBe(3);
  });

  it("clears pending backoff when aborted between attempts", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let calls = 0;
    const pending = retry(
      async () => {
        calls += 1;
        throw new NetworkError("temporary");
      },
      { signal: controller.signal, baseDelayMs: 1000, random: () => 0, timeoutMs: 100 },
    );
    // Let the first attempt reject and enter the exponential-backoff timer.
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects an already-aborted request", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(retry(async () => "never", { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("times out an operation", async () => {
    await expect(
      retry(() => new Promise<string>(() => {}), { attempts: 1, timeoutMs: 5 }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it("creates an abort error with the expected name", () => {
    expect(abortError()).toMatchObject({
      name: "AbortError",
      message: "Request aborted",
    });
  });
});

describe("LatestRequest", () => {
  it("does not let an older delayed response overwrite a newer result", async () => {
    vi.useFakeTimers();
    const latest = new LatestRequest<string>();
    let current = "";
    const old = latest.run(
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("old"), 100);
        }),
      (value) => {
        current = value;
      },
    );
    const newer = latest.run(
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("new"), 10);
        }),
      (value) => {
        current = value;
      },
    );
    await vi.advanceTimersByTimeAsync(10);
    await newer;
    expect(current).toBe("new");
    await vi.advanceTimersByTimeAsync(100);
    await old;
    expect(current).toBe("new");
  });

  it("supports cancelling the current request", async () => {
    const latest = new LatestRequest<string>();
    let commitCalled = false;

    const pending = latest.run(
      (signal) =>
        new Promise<string>((resolve) => {
          signal.addEventListener("abort", () => resolve("cancelled"), { once: true });
        }),
      () => {
        commitCalled = true;
      },
    );

    latest.cancel();
    await pending;

    expect(commitCalled).toBe(false);
  });

  it("rethrows non-abort errors", async () => {
    const latest = new LatestRequest<string>();

    await expect(
      latest.run(
        async () => {
          throw new Error("unexpected");
        },
        () => {},
      ),
    ).rejects.toThrow("unexpected");
  });
});

describe("toAsyncState", () => {
  it("returns empty state for no tasks", () => {
    expect(toAsyncState([])).toEqual({ status: "empty" });
  });

  it("returns success state when tasks exist", () => {
    expect(toAsyncState([task("a")])).toEqual({
      status: "success",
      data: [task("a")],
    });
  });
});
