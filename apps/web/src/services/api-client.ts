// apps/web/src/services/api-client.ts
import { z } from 'zod';
import { route } from '@shared/route';
import type { Meta } from '../schemas';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(public code: string, message: string, public requestId?: string, public status?: number) {
    super(message);
  }
}

export const ERROR_TEXT: Record<string, string> = {
  UNAUTHENTICATED: 'Your session has ended. Sign in again.',
  FORBIDDEN: 'You do not have permission to do this.',
  VALIDATION_ERROR: 'Some fields need attention. Check the form and try again.',
  NOT_FOUND: 'This record no longer exists.',
  PHONE_ALREADY_EXISTS: 'A customer with this phone number already exists.',
  CONFIRMATION_REQUIRED: 'Type CONFIRM to continue.',
  INVALID_STATUS_TRANSITION: 'This record cannot move to that status.',
  CASE_ALREADY_PROCESSED: 'Another user already processed this record. Refresh to see the result.',
  ACCOUNT_LOCKED: 'This account is locked. Contact your administrator.',
  RATE_LIMITED: 'Too many attempts. Wait a moment and try again.',
  VERSION_CONFLICT: 'Someone else changed this record. Reload to see the latest version.',
  PROTECTED_USER: 'This account is protected and cannot be changed.',
  MFA_REQUIRED: 'Enter your verification code to continue.',
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
};

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? ERROR_TEXT[e.code] ?? e.message : 'Something went wrong. Try again.';

type Query = Record<string, string | number | undefined>;

export interface CallOptions<T extends z.ZodTypeAny> {
  params?: Record<string, string>;
  query?: Query;
  body?: unknown;
  schema?: T;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const FUNCTION_MAP: Record<string, string> = {
  auth: 'auth',
  users: 'users',
  roles: 'roles-permissions',
  permissions: 'roles-permissions',
  menus: 'roles-permissions',
  organizations: 'roles-permissions',
  customers: 'customers',
  cases: 'cases',
  outsource: 'outsource',
  workflow: 'workflow',
  reports: 'reports',
  ceo: 'ceo',
  finance: 'finance',
  audit: 'audit',
  files: 'files',
};

function resolveFunctionTarget(key: string, params: Record<string, string> = {}): { method: string; url: string } {
  const { method, path } = route(key, params);
  const cleanPath = path.replace(/^\/api\/v1/, '');
  const prefix = key.split('.')[0];
  const functionName = FUNCTION_MAP[prefix] || prefix;

  let subPath = cleanPath;
  if (subPath.startsWith(`/${functionName}/`)) {
    subPath = subPath.replace(new RegExp(`^/${functionName}`), '');
  } else if (subPath === `/${functionName}`) {
    subPath = '/';
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hzdtwpvwxjmgnhkjjicb.supabase.co';
  const finalSubPath = subPath === '/' ? '' : subPath;
  return {
    method,
    url: `${supabaseUrl}/functions/v1/${functionName}${finalSubPath}`,
  };
}

async function send(key: string, o: { params?: Record<string, string>; query?: Query; body?: unknown }) {
  if (USE_MOCK) {
    const { mockHandlers } = await import('./mock');
    const h = mockHandlers[key];
    if (!h) throw new ApiError('NOT_FOUND', `No mock for ${key}`);
    return h(o);
  }

  const { method, url: baseUrl } = resolveFunctionTarget(key, o.params);
  const qs = new URLSearchParams();
  Object.entries(o.query ?? {}).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, String(v)));

  // Retrieve current Supabase JWT session
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Whjx3raRdRM6X0lwbDtHmQ_XB5ypfev';

  const headers: Record<string, string> = {
    Accept: 'application/json',
    apikey: anonKey,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (o.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const q = qs.toString();
  const finalUrl = q ? `${baseUrl}?${q}` : baseUrl;

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error || json;
    throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? res.statusText, err?.requestId, res.status);
  }
  return json;
}

export const api = {
  async call<T extends z.ZodTypeAny>(
    key: string,
    o: CallOptions<T> & { schema: T }
  ): Promise<{ data: z.infer<T>; meta?: z.infer<typeof Meta> }> {
    const json = await send(key, o);
    return z.object({ data: o.schema, meta: z.any().optional() }).parse(json) as unknown as {
      data: z.infer<T>;
      meta?: z.infer<typeof Meta>;
    };
  },
  resetCsrf() {},
};
