import { test, expect } from '@playwright/test';
import { Api } from '../helpers/api';
import { createUser, customerBody, disableUsers, expectOk, loginAs, superAdmin, uid, type TestUser } from '../helpers/factory';

const SQLI = [`' OR '1'='1`, `'; DROP TABLE users;--`, `" OR ""="`, `1; SELECT pg_sleep(6)--`, `' UNION SELECT NULL,NULL--`, `\\'; SELECT pg_sleep(6)--`, `%27%20OR%201=1--`, `a'||(SELECT pg_sleep(6))||'`, '\u0000', 'x'.repeat(5000)];
const XSS = [`<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, `<svg/onload=alert(1)>`, `javascript:alert(1)`, `{{constructor.constructor('alert(1)')()}}`];
const DB_ERR = /syntax error|pg_|prisma|PrismaClient|SQLSTATE|relation ".*" does not exist|unterminated|at .*\.(ts|js):\d+/i;

test.describe('injection and XSS (ASVS V5)', () => {
  let admin: Api, os: Api, agent: Api, tl: Api; const users: TestUser[] = [];
  test.beforeAll(async () => {
    admin = await superAdmin();
    const [o, a, t] = [await createUser(admin, 'OUTSOURCE'), await createUser(admin, 'AGENT'), await createUser(admin, 'TEAM_LEADER')];
    users.push(o, a, t); os = await loginAs(o); agent = await loginAs(a); tl = await loginAs(t);
  });
  test.afterAll(async () => { await disableUsers(admin, users); });

  const LISTS: Array<[string, () => Api, string[]]> = [
    ['cases.list', () => tl, ['search', 'phone', 'status', 'sort', 'agentId', 'teamLeaderId', 'minCallSeconds', 'dateFrom', 'page', 'pageSize']],
    ['outsource.cases', () => os, ['search', 'phone', 'status', 'sort', 'submittedFrom']],
    ['customers.list', () => tl, ['search', 'phone', 'sort']],
    ['users.list', () => admin, ['search', 'role', 'status', 'sort']],
    ['audit.list', () => admin, ['search', 'sort', 'dateFrom']],
    ['finance.incomeList', () => admin, ['search', 'category', 'sort']],
    ['finance.expenseList', () => admin, ['search', 'expenseHeadId', 'sort']],
  ];

  for (const [key, who, params] of LISTS) {
    test(`SQL injection in ${key} query params: no 5xx, no DB errors, no delay, no widened results`, async () => {
      for (const p of params) for (const payload of SQLI) {
        const t0 = Date.now();
        const r = await who().call(key, { query: { [p]: payload } });
        expect(r.status, `${key}?${p}=${payload.slice(0, 30)} -> ${r.status}`).toBeLessThan(500);
        expect(r.text, 'DB internals leaked').not.toMatch(DB_ERR);
        expect(Date.now() - t0, 'pg_sleep payload executed?').toBeLessThan(5000);
      }
    });
  }

  test('boolean-based injection does not widen a phone filter', async () => {
    const baseline = await os.call('outsource.cases', { query: { phone: '+0000000000000', pageSize: 100 } });
    const inj = await os.call('outsource.cases', { query: { phone: `' OR '1'='1`, pageSize: 100 } });
    expectOk(baseline);
    if (inj.status === 200) expect(inj.body.data.length).toBeLessThanOrEqual(baseline.body.data.length);
  });

  test('injection payloads in write bodies are stored literally (parameterised) or rejected', async () => {
    for (const payload of SQLI.slice(0, 5)) {
      const body = customerBody({ firstName: payload.slice(0, 40), address: payload, extra: { note: payload } });
      const r = await agent.call('customers.create', { body });
      expect(r.status, `create with ${payload.slice(0, 20)}`).toBeLessThan(500); expect(r.text).not.toMatch(DB_ERR);
      if (r.status < 300) expect((await agent.call('customers.get', { params: { id: r.body.data.customer.id } })).body.data.address).toBe(payload);
    }
    expectOk(await admin.call('users.list'));                                  // "DROP TABLE users" did not run
  });

  test('stored XSS payloads never come back as HTML and are inert in JSON', async () => {
    for (const payload of XSS) {
      const r = await agent.call('customers.create', { body: customerBody({ firstName: payload.slice(0, 60), lastName: payload.slice(0, 60), address: payload, extra: { note: payload } }) });
      expect(r.status).toBeLessThan(500);
      expect(r.headers['content-type']).toMatch(/application\/json/); expect(r.headers['x-content-type-options']).toBe('nosniff');
      if (r.status < 300) {
        const g = await tl.call('cases.list', { query: { phone: r.body.data.customer.phone } });
        expect(g.headers['content-type']).toMatch(/application\/json/);
      }
    }
  });

  test('mass assignment: client-supplied id/organizationId/status/createdAt are ignored or rejected', async () => {
    const forged = '11111111-1111-4111-8111-111111111111';
    const r = await agent.call('customers.create', { body: { ...customerBody(), id: forged, organizationId: forged, status: 'ACCEPTED', createdAt: '2000-01-01T00:00:00Z', case: { status: 'ACCEPTED' } } });
    if (r.status < 300) { expect(r.body.data.customer.id).not.toBe(forged); expect(r.body.data.case.status).toBe('PENDING'); expect(r.body.data.customer.createdAt).not.toMatch(/^2000/); }
    else expect(r.status).toBe(400);
  });

  test('prototype-pollution style JSON and oversized bodies do not break the service', async () => {
    const raw = `{"firstName":"a","lastName":"b","phone":"+92300${uid()}","dateOfBirth":"1990-01-01","address":"x","zipCode":"1","extra":{"__proto__":{"isAdmin":true},"constructor":{"prototype":{"x":1}}}}`;
    const r = await agent.ctx.fetch((await import('../../packages/shared-types/src/route')).route('customers.create').path, { method: 'POST', headers: { 'content-type': 'application/json', 'X-CSRF-Token': agent.csrfToken }, data: raw });
    expect(r.status()).toBeLessThan(500);
    expect((await agent.call('auth.me')).body.data.permissions).not.toContain('user:create');
    const huge = await agent.call('customers.create', { body: customerBody({ extra: { blob: 'x'.repeat(2_000_000) } }) });
    expect([400, 413]).toContain(huge.status);
  });

  test('type confusion: arrays/objects where strings are expected give VALIDATION_ERROR, not 500', async () => {
    for (const bad of [{ firstName: ['a'] }, { phone: { $ne: null } }, { zipCode: 12345 }, { dateOfBirth: 'not-a-date' }, { dateOfBirth: '2025-13-45' }]) {
      const r = await agent.call('customers.create', { body: { ...customerBody(), ...bad } });
      expect(r.status, JSON.stringify(bad)).toBe(400); expect(r.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect((await os.call('cases.setCallLength', { params: { id: '00000000-0000-4000-8000-000000000000' }, body: { durationSeconds: 'abc' } })).status).toBeLessThan(500);
    const neg = await tl.call('cases.setCallLength', { params: { id: '00000000-0000-4000-8000-000000000000' }, body: { durationSeconds: -5 } });
    expect([400, 404]).toContain(neg.status);
  });
});
