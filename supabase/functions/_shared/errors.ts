// supabase/functions/_shared/errors.ts

export const ERROR_HTTP_STATUS = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  PHONE_ALREADY_EXISTS: 409,
  CONFIRMATION_REQUIRED: 400,
  INVALID_STATUS_TRANSITION: 409,
  CASE_ALREADY_PROCESSED: 409,
  ACCOUNT_LOCKED: 423,
  RATE_LIMITED: 429,
  VERSION_CONFLICT: 409,
  PROTECTED_USER: 403,
  MFA_REQUIRED: 403,
  INVALID_CREDENTIALS: 401,
} as const;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

export function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  statusOverride?: number
): Response {
  const status = statusOverride ?? ERROR_HTTP_STATUS[code] ?? 500;
  return jsonResponse(
    {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    status
  );
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
