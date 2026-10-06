// supabase/functions/_shared/rate-limit.ts
import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export async function checkRateLimit(
  client: SupabaseClient,
  options: RateLimitOptions
): Promise<{ allowed: boolean; currentCount: number }> {
  const { key, limit, windowSeconds } = options;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();

  const { data, error } = await client.rpc('increment_rate_limit', {
    p_key: key,
    p_window_start: windowStart,
    p_limit: limit,
  });

  if (error) {
    console.error('Rate limit check error:', error);
    // If rate limiter fails, allow the request to proceed rather than blocking traffic
    return { allowed: true, currentCount: 1 };
  }

  const currentCount = Number(data);
  return {
    allowed: currentCount <= limit,
    currentCount,
  };
}
