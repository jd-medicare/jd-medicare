import { test, expect } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { createUser, disableUsers, superAdmin, type TestUser } from '../helpers/factory';

// Runs LAST (file name 99-): it deliberately trips limiters, which can throttle this runner's IP for a minute.
// These clients do NOT send X-CI-Bypass, so they see the EDGE limiter as an ordinary visitor would.
const EDGE = process.env.E2E_EXPECT_RATE_LIMITS === '1';

test.describe('rate limiting and brute force (ASVS 2.2.1, 11.1.4)', () => {
  let admin: Api, victim: TestUser;
  test.beforeAll(async () => { admin = await superAdmin(); victim = await createUser(admin, 'AGENT'); });
  test.afterAll(async () => { await admin.call('users.unlock', { params: { id: victim.id }, body: { reason: 'rate-limit test cleanup' } }).catch(() => {}); await disableUsers(admin, [victim]); });

  test('login brute force against one account is throttled or locks the account', async () => {
    const attacker = await Api.create(false); const codes: string[] = [];
    for (let i = 0; i < 25; i++) { const r = await attacker.login(victim.email, `Wrong-${i}-Password!`); codes.push(`${r.status}:${errCode(r) ?? ''}`); }
    expect(codes.some((c) => /RATE_LIMITED|ACCOUNT_LOCKED|^429/.test(c)), `no throttling observed in 25 attempts: ${codes.join(' ')}`).toBeTruthy();
    const right = await (await Api.create(false)).login(victim.email, victim.password);       // attacker eventually guessing right must not get in while throttled
    expect(right.status === 200 && right.body?.data?.user, 'correct password accepted during brute-force window').toBeFalsy();
  });

  test('rate-limited responses use the contract error shape', async () => {
    test.skip(!EDGE, 'set E2E_EXPECT_RATE_LIMITS=1 on environments with the edge proxy');
    const a = await Api.create(false); let hit: any;
    for (let i = 0; i < 40 && !hit; i++) { const r = await a.call('auth.passwordForgot', { body: { email: `x${i}@example.test` } }); if (r.status === 429) hit = r; }
    expect(hit, 'no 429 within 40 rapid requests').toBeTruthy();
    expect(hit.body.error.code).toBe('RATE_LIMITED'); expect(hit.body.error.requestId).toBeTruthy();
  });

  test('credential stuffing across many accounts from one IP is throttled', async () => {
    test.skip(!EDGE, 'set E2E_EXPECT_RATE_LIMITS=1 on environments with the edge proxy');
    const a = await Api.create(false); let limited = 0;
    for (let i = 0; i < 40; i++) { const r = await a.login(`stuff.${i}.${Date.now()}@example.test`, 'Password1!'); if (r.status === 429 || errCode(r) === 'RATE_LIMITED') limited++; }
    expect(limited).toBeGreaterThan(0);
  });

  test('search / list endpoints are throttled under a burst', async () => {
    test.skip(!EDGE, 'set E2E_EXPECT_RATE_LIMITS=1 on environments with the edge proxy');
    const u = await createUser(admin, 'TEAM_LEADER'); const api = await Api.create(false); await api.login(u.email, u.password);
    const rs = await Promise.all(Array.from({ length: 250 }, () => api.call('cases.list', { query: { search: 'a' } })));
    expect(rs.some((r) => r.status === 429), 'no 429 in a 250-request burst').toBeTruthy();
    await disableUsers(admin, [u]);
  });

  test('export creation burst is throttled (no unbounded job creation)', async () => {
    const attacker = await createUser(admin, 'ADMIN'); const rs: number[] = [];
    // Primary Super Admin session is used for creation because plain ADMIN lacks report:export by default
    for (let i = 0; i < 30; i++) rs.push((await admin.call('reports.exportCreate', { body: { reportType: 'OUTSOURCE', format: 'CSV', filters: {} } })).status);
    expect(rs.some((s) => s === 429), `no throttling in 30 export requests: ${rs.join(',')}`).toBeTruthy();
    await disableUsers(admin, [attacker]);
  });
});
