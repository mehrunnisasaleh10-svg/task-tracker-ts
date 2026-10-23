import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryCache } from "../src/cache";
import { createSearch } from "../src/search";

afterEach(() => vi.useRealTimers());

describe("cache", () => {
  it("serves fresh data until TTL expires", async () => {
    let now = 0;
    const cache = new MemoryCache<string, string>({ ttlMs: 100, now: () => now });
    cache.set("k", "cached");
    expect(cache.get("k")).toBe("cached");
    now = 101;
    expect(cache.get("k")).toBeUndefined();
  });
  it("fetches normally on a cache miss", async () => {
    const cache = new MemoryCache<string, string>({ ttlMs: 1000 });
    const value = cache.getStaleWhileRevalidate("missing", async () => "fresh");
    await expect(value).resolves.toBe("fresh");
    expect(cache.get("missing")).toBe("fresh");
  });
  it("deduplicates concurrent fetches for one key", async () => {
    const cache = new MemoryCache<string, string>({ ttlMs: 1000 });
    let calls = 0;
    const fetcher = async (): Promise<string> => {
      calls += 1;
      await Promise.resolve();
      return "value";
    };
    const [a, b] = await Promise.all([
      cache.getOrFetch("k", fetcher),
      cache.getOrFetch("k", fetcher),
    ]);
    expect([a, b]).toEqual(["value", "value"]);
    expect(calls).toBe(1);
  });
  it("returns stale data and triggers refresh", async () => {
    let now = 0;
    const cache = new MemoryCache<string, string>({ ttlMs: 10, now: () => now });
    cache.set("k", "old");
    now = 11;
    expect(cache.getStaleWhileRevalidate("k", async () => "new")).toBe("old");
    await Promise.resolve();
    expect(cache.get("k")).toBe("new");
  });
});

describe("debounced search", () => {
  it("collapses rapid input into one request", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (query: string) => query);
    const search = createSearch(fetcher, { debounceMs: 50 });
    const result = vi.fn();
    search.search("a", result);
    search.search("ab", result);
    search.search("abc", result);
    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toHaveBeenCalledWith("abc");
  });
  it("cancels an in-flight request and ignores its stale result", async () => {
    vi.useFakeTimers();
    const resolvers: Array<(value: string) => void> = [];
    const fetcher = vi.fn(
      (query: string) =>
        new Promise<string>((resolve) => {
          resolvers.push(() => resolve(query));
        }),
    );
    const search = createSearch(fetcher, { debounceMs: 10 });
    const results: string[] = [];
    search.search("old", (value) => results.push(value));
    await vi.advanceTimersByTimeAsync(10);
    search.search("new", (value) => results.push(value));
    resolvers[0]?.("old");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    resolvers[1]?.("new");
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(results).toEqual(["new"]);
  });
  it("cancels pending search", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (query: string) => query);
    const search = createSearch(fetcher, { debounceMs: 50 });
    search.search("query", vi.fn());
    search.cancel();
    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
