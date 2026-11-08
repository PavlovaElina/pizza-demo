/** Shared request budget for one demo server; no client identifiers are stored. */
export function createRateLimit(limit = 60, windowMs = 60_000) {
  let windowEnd = 0;
  let requests = 0;
  return (now = Date.now()): number => {
    if (now >= windowEnd) {
      windowEnd = now + windowMs;
      requests = 0;
    }
    if (requests >= limit) return Math.ceil((windowEnd - now) / 1000);
    requests += 1;
    return 0;
  };
}
