// Fixed-window rate limiter held in memory, with a hard cap on how many keys
// it remembers, so a flood of distinct IPs can't grow it without bound.
//
// Best-effort only: each Cloudflare isolate has its own copy, and isolates
// come and go. Real protection is a Cloudflare WAF rate-limiting rule.
export type RateLimiterOptions = { windowMs: number; maxHits: number; maxKeys: number };

export function createRateLimiter({ windowMs, maxHits, maxKeys }: RateLimiterOptions) {
  const hits = new Map<string, { n: number; t: number }>();

  function limited(key: string, now = Date.now()): boolean {
    const h = hits.get(key);
    if (h && now - h.t <= windowMs) { h.n += 1; return h.n > maxHits; }
    if (h) hits.delete(key);
    if (hits.size >= maxKeys) {
      // Drop expired windows first, then the oldest entries if still full.
      // A Map iterates in insertion order, and a key is re-inserted whenever
      // its window restarts, so the first keys are always the oldest.
      for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k);
      for (const k of hits.keys()) { if (hits.size < maxKeys) break; hits.delete(k); }
    }
    hits.set(key, { n: 1, t: now });
    return false;
  }
  limited.size = () => hits.size;
  return limited;
}
