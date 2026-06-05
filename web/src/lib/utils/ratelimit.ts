// Simple in-process sliding-window rate limiter.
// Good enough for v1; swap for Redis-backed implementation in M6 hardening.

const buckets = new Map<string, number[]>()

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key     Unique key (e.g. "inquiry:1.2.3.4")
 * @param limit   Max requests per window
 * @param windowS Window size in seconds
 */
export function checkRateLimit(key: string, limit: number, windowS: number): boolean {
  const now = Date.now()
  const windowMs = windowS * 1000
  const timestamps = (buckets.get(key) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= limit) return false
  timestamps.push(now)
  buckets.set(key, timestamps)
  return true
}
