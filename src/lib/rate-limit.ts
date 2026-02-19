// Simple in-memory rate limiter for auth endpoints
// No external dependencies — uses a Map with IP+key → { count, resetTime }

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Check if a request should be rate limited.
 * Cleans up expired entries on each call.
 *
 * @param ip - Client IP address
 * @param key - Rate limit bucket key (e.g. 'forgot-password', 'activate')
 * @param maxRequests - Maximum requests allowed within the window
 * @param windowMs - Time window in milliseconds
 * @returns { success: boolean, remaining: number }
 */
export function rateLimit(
  ip: string,
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now()

  // Cleanup expired entries to prevent memory leaks
  for (const [mapKey, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(mapKey)
    }
  }

  const identifier = `${ip}:${key}`
  const entry = rateLimitMap.get(identifier)

  // No existing entry or window has expired — start fresh
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { success: true, remaining: maxRequests - 1 }
  }

  // Within window — check if limit exceeded
  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0 }
  }

  // Increment count
  entry.count++
  return { success: true, remaining: maxRequests - entry.count }
}
