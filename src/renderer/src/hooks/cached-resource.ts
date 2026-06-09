// Low-level cache primitive shared by the renderer's stale-while-revalidate
// hooks (sessions / health / agent plugins / memory). It owns ONLY the cache
// mechanics each hook used to hand-roll — TTL freshness, in-flight de-dup, and
// optional signature-based identity preservation — while each hook keeps its
// own React orchestration (triggers, error handling, soft-refresh wiring).
//
// Keyed callers (e.g. sessions, one entry per request) pass an explicit key;
// single-entry callers omit it (default '').

interface CachedResourceEntry<T> {
  value: T
  signature: string
  updatedAtMs: number
}

export class CachedResource<T> {
  private readonly entries = new Map<string, CachedResourceEntry<T>>()
  private readonly inflight = new Map<string, Promise<T>>()

  constructor(
    private readonly ttlMs: number,
    // When provided, a re-fetch whose payload has the same signature preserves
    // the previous value object identity (avoids re-render churn downstream).
    private readonly signatureOf?: (value: T) => string
  ) {}

  /** Current cached value for `key`, regardless of freshness. */
  peek(key = ''): T | undefined {
    return this.entries.get(key)?.value
  }

  /** True if a cached value exists and is within the TTL window. */
  isFresh(key = ''): boolean {
    const entry = this.entries.get(key)
    return entry != null && Date.now() - entry.updatedAtMs < this.ttlMs
  }

  /** Store `value`, preserving the previous object identity on signature match. */
  set(key: string, value: T): T {
    if (this.signatureOf) {
      const signature = this.signatureOf(value)
      const previous = this.entries.get(key)
      const entry: CachedResourceEntry<T> =
        previous && previous.signature === signature
          ? { ...previous, updatedAtMs: Date.now() }
          : { value, signature, updatedAtMs: Date.now() }
      this.entries.set(key, entry)
      return entry.value
    }
    this.entries.set(key, { value, signature: '', updatedAtMs: Date.now() })
    return value
  }

  /** Fetch for `key`, de-duping concurrent callers; result is cached via set(). */
  request(key: string, fetcher: () => Promise<T>): Promise<T> {
    const pending = this.inflight.get(key)
    if (pending) return pending
    const next = fetcher()
      .then((value) => this.set(key, value))
      .finally(() => {
        this.inflight.delete(key)
      })
    this.inflight.set(key, next)
    return next
  }

  /** Drop a single key's cached value + in-flight promise (used by reload). */
  invalidate(key = ''): void {
    this.entries.delete(key)
    this.inflight.delete(key)
  }

  /** Clear everything (used by the *ForTests reset helpers). */
  clear(): void {
    this.entries.clear()
    this.inflight.clear()
  }
}
