import { test, expect } from '@playwright/test';
import registry from '../../packages/shared-types/api-registry.json';
import { Api, errCode } from '../helpers/api';

// ASVS V4 / V2: every protected endpoint must reject anonymous callers, driven by the registry so new routes are covered automatically.
const PUBLIC = new Set(['auth.login', 'auth.csrf', 'auth.passwordForgot', 'auth.passwordReset', 'auth.mfaVerify', 'auth.logout']);
const ZERO = '00000000-0000-4000-8000-000000000000';

test.describe('anonymous access (ASVS 4.1, 4.2)', () => {
  for (const r of registry.filter((x) => !PUBLIC.has(x.key))) {
    test(`${r.key} -> UNAUTHENTICATED`, async () => {
      const api = await Api.create();
      await api.refreshCsrf();
      const params = Object.fromEntries([...r.path.matchAll(/:([A-Za-z]+)/g)].map((m) => [m[1], ZERO]));
      const res = await api.call(r.key, { params, body: {} });
      expect(res.status, `${r.method} ${r.path}`).toBe(401);
      expect(errCode(res)).toBe('UNAUTHENTICATED');
      await api.dispose();
    });
  }
  test('auth.me and auth.logout without a session do not leak anything', async () => {
    const api = await Api.create();
    expect((await api.call('auth.me')).status).toBe(401);
    expect([200, 204, 401]).toContain((await api.call('auth.logout')).status);
    await api.dispose();
  });
});
