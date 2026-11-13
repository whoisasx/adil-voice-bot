import "server-only";
import { config } from "./config";

/**
 * Best-effort in-memory fixed-window limiter. Per instance only (Fluid Compute reuses
 * instances, so it still blunts abuse). Upgrade to a shared store if ever needed.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  request: Request,
  scope: string,
  limit: { requests: number; windowMs: number } = config.rateLimit,
): Response | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const { requests, windowMs } = limit;

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return null;
  }

  bucket.count += 1;
  if (bucket.count > requests) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return Response.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}
