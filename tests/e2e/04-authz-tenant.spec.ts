import { test, expect } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { createUser, customerBody, disableUsers, expectOk, loginAs, submitCase, superAdmin, type TestUser } from '../helpers/factory';
import { optional } from '../helpers/env';

test.describe.serial('unauthorized actions and tenant isolation', () => {
  let admin: Api, agent: Api, tl: Api, os: Api;
  let users: TestUser[] = [];
  let caseId = '', customerId = '', phone = '';

  test.beforeAll(async () => {
    admin = await superAdmin();
    const [a, t, o] = [await createUser(admin, 'AGENT'), await createUser(admin, 'TEAM_LEADER'), await createUser(admin, 'OUTSOURCE')];
    users = [a, t, o]; agent = await loginAs(a); tl = await loginAs(t); os = await loginAs(o);
    const c = await submitCase(agent); caseId = c.caseId; customerId = c.customerId; phone = c.body.phone;
  });
  test.afterAll(async () => { await disableUsers(admin, users); });

  test('unauthenticated, Agent and Team Leader cannot Accept or Reject', async () => {
    const anon = await Api.create();
    expect(errCode(await anon.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }))).toBe('UNAUTHENTICATED');
    expect(errCode(await anon.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM', reason: 'x' } }))).toBe('UNAUTHENTICATED');
    for (const who of [agent, tl]) {
      expect(errCode(await who.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }))).toBe('FORBIDDEN');
      expect(errCode(await who.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM', reason: 'x' } }))).toBe('FORBIDDEN');
    }
    expect((await admin.call('cases.get', { params: { id: caseId } })).body.data.status).toBe('PENDING');
  });

  test('Outsource cannot create customers, manage users, read finance or the CEO dashboard', async () => {
    expect(errCode(await os.call('customers.create', { body: customerBody() }))).toBe('FORBIDDEN');
    expect(errCode(await os.call('users.list'))).toBe('FORBIDDEN');
    expect(errCode(await os.call('finance.incomeList'))).toBe('FORBIDDEN');
    expect(errCode(await os.call('ceo.dashboard', { query: { range: 'TODAY' } }))).toBe('FORBIDDEN');
    expect(errCode(await os.call('audit.list'))).toBe('FORBIDDEN');
  });

  test('Agent only sees own records', async () => {
    const other = await createUser(admin, 'AGENT'); users.push(other);
    const otherApi = await loginAs(other);
    const mine = await otherApi.call('cases.list', { query: { phone } }); expectOk(mine);
    expect(mine.body.data).toHaveLength(0);
    expect([403, 404]).toContain((await otherApi.call('cases.get', { params: { id: caseId } })).status);
    expect([403, 404]).toContain((await otherApi.call('customers.get', { params: { id: customerId } })).status);
  });

  test('tenant isolation: a second organization cannot read, search, or modify this organization\'s data', async () => {
    const email = optional('E2E_ORG2_ADMIN_EMAIL'), pw = optional('E2E_ORG2_ADMIN_PASSWORD');
    test.skip(!email || !pw, 'E2E_ORG2_ADMIN_* not configured (second tenant required)');
    const org2 = await Api.create(); expectOk(await org2.login(email!, pw!, optional('E2E_ORG2_ADMIN_TOTP_SECRET')));

    expect((await org2.call('cases.get', { params: { id: caseId } })).status).toBe(404);
    expect((await org2.call('customers.get', { params: { id: customerId } })).status).toBe(404);
    expect((await org2.call('cases.history', { params: { id: caseId } })).status).toBe(404);
    expect((await org2.call('cases.list', { query: { phone } })).body.data).toHaveLength(0);
    expect((await org2.call('customers.list', { query: { search: phone } })).body.data).toHaveLength(0);
    expect(errCode(await org2.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }))).toBe('NOT_FOUND');
    expect(errCode(await org2.call('cases.setCallLength', { params: { id: caseId }, body: { durationSeconds: 1 } }))).toBe('NOT_FOUND');
    const orgA = (await admin.call('organizations.current')).body.data?.id as string | undefined;   // ASSUMPTION: organizations.current returns { data: { id, ... } }
    const foreign = new Set(users.map((u) => u.id));
    const list2 = await org2.call('users.list', { query: { search: 'e2e.', pageSize: 100 } }); expectOk(list2);
    expect(list2.body.data.filter((u: any) => foreign.has(u.id)), 'org2 sees org1 users').toHaveLength(0);

    // organizationId from the client must be ignored or rejected, never honoured
    const spoof = await org2.call('customers.create', { body: { ...customerBody(), organizationId: orgA ?? '11111111-1111-4111-8111-111111111111' } });
    if (spoof.status < 300) {
      const created = await org2.call('customers.get', { params: { id: spoof.body.data.customer.id } });
      expect(created.status).toBe(200);
      expect((await admin.call('customers.get', { params: { id: spoof.body.data.customer.id } })).status).toBe(404);
    } else expect(errCode(spoof)).toBe('VALIDATION_ERROR');
    expect((await admin.call('cases.get', { params: { id: caseId } })).body.data.status).toBe('PENDING');
  });
});
