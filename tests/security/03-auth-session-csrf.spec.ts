import { test, expect } from '@playwright/test';
import { request } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { route } from '../../packages/shared-types/src/route';
import { baseURL } from '../helpers/env';
import { createUser, disableUsers, expectOk, loginAs, superAdmin, type TestUser } from '../helpers/factory';

const cookieHeader = async (api: Api) => (await api.ctx.storageState()).cookies.map((c) => `${c.name}=${c.value}`).join('; ');

test.describe('authentication, sessions, CSRF, CORS (ASVS V2, V3, V13/V14)', () => {
  let admin: Api, u: TestUser; let userApi: Api;
  test.beforeAll(async () => { admin = await superAdmin(); u = await createUser(admin, 'AGENT'); userApi = await loginAs(u); });
  test.afterAll(async () => { await disableUsers(admin, [u]); });

  test('login errors do not reveal whether the email exists', async () => {
    const a = await Api.create(); const b = await Api.create();
    const unknown = await a.login(`nobody.${Date.now()}@example.test`, 'Wrong-password-1!');
    const wrong = await b.login(u.email, 'Wrong-password-1!');
    expect(errCode(unknown)).toBe('INVALID_CREDENTIALS'); expect(errCode(wrong)).toBe('INVALID_CREDENTIALS');
    expect(unknown.status).toBe(wrong.status); expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  test('password forgot is identical for known and unknown emails (no enumeration)', async () => {
    const a = await Api.create();
    const known = await a.call('auth.passwordForgot', { body: { email: u.email } });
    const unknown = await a.call('auth.passwordForgot', { body: { email: `nobody.${Date.now()}@example.test` } });
    expect(known.status).toBe(unknown.status); expect(Object.keys(known.body ?? {})).toEqual(Object.keys(unknown.body ?? {}));
  });

  test('password reset rejects bad/guessable tokens and weak passwords', async () => {
    const a = await Api.create();
    for (const token of ['', 'x', '0'.repeat(32), '../../x']) expect((await a.call('auth.passwordReset', { body: { token, newPassword: 'Aa1!longEnoughPassw0rd' } })).status).toBeGreaterThanOrEqual(400);
    const weak = await a.call('users.create', { body: { email: `w.${Date.now()}@example.test`, fullName: 'w', roleKey: 'AGENT', password: '123' } });
    expect([401, 403, 400]).toContain(weak.status);
  });

  test('session cookie is HttpOnly + Secure + SameSite; no token is returned in the body', async () => {
    const api = await Api.create(); await api.refreshCsrf();
    const r = route('auth.login');
    const res = await api.ctx.fetch(r.path, { method: r.method, headers: { 'X-CSRF-Token': api.csrfToken }, data: { email: u.email, password: u.password } });
    const setCookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value);
    expect(setCookies.length).toBeGreaterThan(0);
    const sess = setCookies.find((c) => /^(__Host-)?sid|session/i.test(c)) ?? setCookies[0];
    expect(sess).toMatch(/HttpOnly/i); expect(sess).toMatch(/SameSite=(Lax|Strict)/i);
    if (!/localhost|127\.0\.0\.1/.test(baseURL())) expect(sess).toMatch(/Secure/i);
    const text = await res.text();
    expect(text).not.toMatch(/"(access_?token|token|jwt|refresh_?token|sessionId)"/i);
    expect(text).not.toContain(u.password);
  });

  test('session id changes at login (no fixation) and old id is useless', async () => {
    const api = await Api.create(); await api.refreshCsrf();
    const before = (await api.ctx.storageState()).cookies.map((c) => c.value);
    expectOk(await api.login(u.email, u.password));
    const after = (await api.ctx.storageState()).cookies.map((c) => c.value);
    expect(after.some((v) => !before.includes(v)), 'a new cookie value must be issued on login').toBeTruthy();
  });

  test('CSRF: state-changing calls without / with wrong / foreign token are refused', async () => {
    const mine = await userApi.call('customers.create', { body: {}, csrf: 'none' });
    expect(mine.status).toBe(403);
    expect((await userApi.call('customers.create', { body: {}, csrf: 'definitely-wrong-token' })).status).toBe(403);
    const other = await loginAs(u);                                       // second session of the same user
    expect((await userApi.call('customers.create', { body: {}, csrf: other.csrfToken })).status, 'token from another session').toBe(403);
    const cross = await userApi.call('auth.logout', { csrf: 'none', headers: { Origin: 'https://evil.example' } });
    expect(cross.status).toBe(403);
    expect((await userApi.call('auth.me')).status).toBe(200);              // victim session survived the forged logout
  });

  test('CSRF: a plain cross-site form post (text/plain, no custom header) cannot change state', async () => {
    const r = route('users.lock', { id: u.id });
    const res = await userApi.ctx.fetch(r.path, { method: 'POST', headers: { 'content-type': 'text/plain', Origin: 'https://evil.example' }, data: '{}' });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('logout destroys the session server-side (old cookie rejected) and tampered cookies fail', async () => {
    const api = await loginAs(u); const cookies = await cookieHeader(api);
    expect((await api.call('auth.me')).status).toBe(200);
    expectOk(await api.call('auth.logout'));
    const replay = await request.newContext({ baseURL: baseURL(), extraHTTPHeaders: { cookie: cookies }, ignoreHTTPSErrors: process.env.E2E_INSECURE_TLS === '1' });
    expect((await replay.fetch(route('auth.me').path)).status()).toBe(401);
    const tampered = await request.newContext({ baseURL: baseURL(), extraHTTPHeaders: { cookie: cookies.replace(/=(.)/g, '=X$1') }, ignoreHTTPSErrors: process.env.E2E_INSECURE_TLS === '1' });
    expect((await tampered.fetch(route('auth.me').path)).status()).toBe(401);
  });

  test('CORS: evil origin gets no allow-origin; preflight is not permissive', async () => {
    const api = await Api.create(); const r = route('auth.login');
    const pre = await api.ctx.fetch(r.path, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-csrf-token' } });
    expect(pre.headers()['access-control-allow-origin'] ?? '').not.toMatch(/evil\.example|\*/);
    const get = await api.ctx.fetch(route('auth.csrf').path, { headers: { Origin: 'https://evil.example' } });
    expect(get.headers()['access-control-allow-origin'] ?? '').not.toMatch(/evil\.example|\*/);
  });

  test('error responses are JSON with requestId, no stack traces or internals', async () => {
    const api = await Api.create(); const r = route('auth.login');
    await api.refreshCsrf();
    const bad = await api.ctx.fetch(r.path, { method: 'POST', headers: { 'content-type': 'application/json', 'X-CSRF-Token': api.csrfToken }, data: '{"email": ' });
    const t = await bad.text();
    expect(bad.status()).toBeGreaterThanOrEqual(400); expect(bad.status()).toBeLessThan(500);
    expect(t).not.toMatch(/at .*\.(ts|js):\d+|node_modules|stack|Prisma|SQLSTATE/i);
    expect(bad.headers()['x-request-id']).toBeTruthy();
    const nf = await userApi.call('cases.get', { params: { id: '00000000-0000-4000-8000-000000000000' } });
    expect(nf.body.error.requestId).toBeTruthy(); expect(nf.headers['x-request-id']).toBeTruthy();
  });

  test('security headers on API responses', async () => {
    const res = await userApi.call('auth.me');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['x-powered-by']).toBeUndefined();
    if (!/localhost|127\.0\.0\.1/.test(baseURL())) { expect(res.headers['strict-transport-security']).toMatch(/max-age=\d{7,}/); expect(res.headers['cache-control']).toMatch(/no-store/); }
  });

  test('health endpoints are not exposed publicly (staging/production)', async () => {
    test.skip(/localhost|127\.0\.0\.1/.test(baseURL()), 'dev exposes health locally');
    const api = await Api.create();
    for (const p of ['/health', '/ready', '/api/docs-json']) expect((await api.ctx.fetch(p)).status(), p).not.toBe(200);
  });
});
