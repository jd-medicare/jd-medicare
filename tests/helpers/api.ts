import { request, type APIRequestContext } from '@playwright/test';
import { route } from '../../packages/shared-types/src/route';
import { baseURL } from './env';

export type Res = { status: number; body: any; headers: Record<string, string>; text: string };
export type CallOpts = {
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  /** 'auto' (default): attach X-CSRF-Token on non-GET. 'none': omit. Any other string: send that value. */
  csrf?: 'auto' | 'none' | string;
};

/** Thin client. Every URL comes from route(registryKey, params): tests never type a path. */
export class Api {
  csrfToken = '';
  constructor(public ctx: APIRequestContext) {}

  /** bypass=false builds a client the EDGE rate limiter treats as an ordinary visitor (used by rate-limit tests). */
  static async create(bypass = true): Promise<Api> {
    const token = process.env.E2E_CI_BYPASS_TOKEN;
    const ctx = await request.newContext({
      baseURL: baseURL(), ignoreHTTPSErrors: process.env.E2E_INSECURE_TLS === '1',
      extraHTTPHeaders: bypass && token ? { 'X-CI-Bypass': token } : {},
    });
    return new Api(ctx);
  }
  async dispose() { await this.ctx.dispose(); }

  async refreshCsrf() {
    const r = route('auth.csrf');
    const res = await this.ctx.fetch(r.path, { method: r.method });
    const j = await res.json().catch(() => null);
    this.csrfToken = j?.data?.csrfToken ?? '';
    return this.csrfToken;
  }

  async call(key: string, o: CallOpts = {}): Promise<Res> {
    const r = route(key, o.params);
    const headers: Record<string, string> = { ...(o.headers ?? {}) };
    if (r.method !== 'GET') {
      const mode = o.csrf ?? 'auto';
      if (mode === 'auto') { if (!this.csrfToken) await this.refreshCsrf(); headers['X-CSRF-Token'] = this.csrfToken; }
      else if (mode !== 'none') headers['X-CSRF-Token'] = mode;
    }
    const query = o.query ? Object.fromEntries(Object.entries(o.query).filter(([, v]) => v !== undefined)) as Record<string, string | number | boolean> : undefined;
    const res = await this.ctx.fetch(r.path, {
      method: r.method, headers, params: query,
      data: r.method === 'GET' ? undefined : (o.body ?? {}),
      maxRedirects: 0,
    });
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: res.status(), body, headers: res.headers(), text };
  }

  /** Login (and MFA when required and a TOTP secret is supplied). */
  async login(email: string, password: string, totpSecret?: string): Promise<Res> {
    await this.refreshCsrf();
    const res = await this.call('auth.login', { body: { email, password } });
    if (res.status < 300 && res.body?.data?.mfaRequired) {
      if (!totpSecret) throw new Error(`MFA required for ${email} but no TOTP secret provided`);
      const { authenticator } = await import('otplib');
      const v = await this.call('auth.mfaVerify', { body: { code: authenticator.generate(totpSecret) } });
      await this.refreshCsrf();
      return v;
    }
    await this.refreshCsrf();   // CSRF token may rotate with the session
    return res;
  }
}

export const errCode = (r: Res) => r.body?.error?.code as string | undefined;
export const isOk = (r: Res) => r.status >= 200 && r.status < 300;
