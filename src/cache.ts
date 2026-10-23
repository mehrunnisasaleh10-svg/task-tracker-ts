export type CacheOptions = Readonly<{ ttlMs: number; now?: () => number }>;
type Entry<T> = { value: T; expiresAt: number };

export class MemoryCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();
  private readonly inFlight = new Map<K, Promise<V>>();
  private readonly now: () => number;

  constructor(private readonly options: CacheOptions) {
    this.now = options.now ?? Date.now;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    return entry && entry.expiresAt > this.now() ? entry.value : undefined;
  }

  set(key: K, value: V): void {
    this.entries.set(key, { value, expiresAt: this.now() + this.options.ttlMs });
  }

  async getOrFetch(key: K, fetcher: () => Promise<V>): Promise<V> {
    const fresh = this.get(key);
    if (fresh !== undefined) return fresh;
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const promise = fetcher()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, promise);
    return promise;
  }

  /** Returns stale data immediately and refreshes it in the background. */
  getStaleWhileRevalidate(key: K, fetcher: () => Promise<V>): V | Promise<V> {
    const entry = this.entries.get(key);
    if (!entry) return this.getOrFetch(key, fetcher);
    if (entry.expiresAt > this.now()) return entry.value;
    if (!this.inFlight.has(key)) {
      const promise = fetcher()
        .then((value) => {
          this.set(key, value);
          return value;
        })
        .finally(() => {
          this.inFlight.delete(key);
        });
      void promise.catch(() => undefined);
      this.inFlight.set(key, promise);
    }
    return entry.value;
  }
}
