import { test, expect } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { createUser, disableUsers, expectOk, loginAs, submitCase, superAdmin, type TestUser } from '../helpers/factory';

const ZERO = '00000000-0000-4000-8000-000000000000';

test.describe('IDOR, privilege escalation, protected user (ASVS 4.2.1, 4.3, 8.2)', () => {
  let admin: Api, a1: Api, a2: Api, adm: Api; const users: TestUser[] = [];
  let c1 = { caseId: '', customerId: '' }; let superId = ''; let a2U: TestUser; let admU: TestUser;

  test.beforeAll(async () => {
    admin = await superAdmin(); superId = (await admin.call('auth.me')).body.data.id;
    const u1 = await createUser(admin, 'AGENT'); a2U = await createUser(admin, 'AGENT'); admU = await createUser(admin, 'ADMIN');
    users.push(u1, a2U, admU); a1 = await loginAs(u1); a2 = await loginAs(a2U); adm = await loginAs(admU);
    c1 = await submitCase(a1);
  });
  test.afterAll(async () => { await disableUsers(admin, users); });

  test('IDOR: agent 2 cannot read, edit or probe agent 1\'s case and customer', async () => {
    for (const [key, params, body] of [
      ['cases.get', { id: c1.caseId }], ['cases.history', { id: c1.caseId }], ['customers.get', { id: c1.customerId }],
      ['cases.update', { id: c1.caseId }, { expectedVersion: 1, customer: { firstName: 'pwn' } }], ['customers.update', { id: c1.customerId }, { firstName: 'pwn' }],
    ] as const) {
      const r = await a2.call(key, { params, body });
      expect([403, 404], `${key} -> ${r.status}`).toContain(r.status);
      expect(JSON.stringify(r.body)).not.toContain('Test');            // no data leaked in the error body
    }
    expect((await admin.call('cases.get', { params: { id: c1.caseId } })).body.data.customer.firstName).not.toBe('pwn');
  });

  test('IDOR: nonexistent and malformed ids give 404 / 400, never 500', async () => {
    expect([403, 404]).toContain((await a1.call('cases.get', { params: { id: ZERO } })).status);
    for (const bad of ['not-a-uuid', '1 OR 1=1', '../../etc/passwd', '%00', 'a'.repeat(500)]) {
      const r = await a1.call('cases.get', { params: { id: bad } });
      expect(r.status, `id=${bad.slice(0, 20)}`).toBeLessThan(500);
      expect([400, 404]).toContain(r.status);
    }
  });

  test('IDOR: list endpoints ignore client-supplied scope filters (agentId) for an Agent', async () => {
    const r = await a2.call('cases.list', { query: { agentId: (await a1.call('auth.me')).body.data.id, pageSize: 100 } });
    expectOk(r); expect(r.body.data.map((c: any) => c.id)).not.toContain(c1.caseId);
  });

  test('vertical escalation: agent cannot change own role, permissions or menus', async () => {
    const me = (await a2.call('auth.me')).body.data;
    for (const [key, body] of [['users.setRole', { roleKey: 'ADMIN' }], ['users.setPermissions', { permissions: ['user:create', 'case:accept'] }], ['users.setMenus', { menus: ['ADMINISTRATION'] }]] as const)
      expect(errCode(await a2.call(key, { params: { id: me.id }, body }))).toBe('FORBIDDEN');
    const mass = await a2.call('users.update', { params: { id: me.id }, body: { fullName: 'ok', roleKey: 'ADMIN', permissions: ['user:create'], status: 'ACTIVE', organizationId: ZERO } });
    expect([200, 400, 403]).toContain(mass.status);
    const after = (await a2.call('auth.me')).body.data;
    expect(after.roleKey).toBe('AGENT'); expect(after.permissions).toEqual(me.permissions); expect(after.organizationId).toBe(me.organizationId);
  });

  test('Admin cannot grant itself permissions it was not given (permission:manage / role:manage)', async () => {
    expect(errCode(await adm.call('users.setPermissions', { params: { id: admU.id }, body: { permissions: ['permission:manage', 'finance:view'] } }))).toBe('FORBIDDEN');
    expect(errCode(await adm.call('users.setRole', { params: { id: admU.id }, body: { roleKey: 'PRIMARY_SUPER_ADMIN' } }))).toMatch(/FORBIDDEN|PROTECTED_USER/);
  });

  test('Primary Super Admin is protected: no lock, disable, demotion, duplication or replacement', async () => {
    for (const [who, api] of [['admin', adm], ['super', admin]] as const) {
      expect(errCode(await api.call('users.lock', { params: { id: superId }, body: { reason: 'x' } })), `${who} lock`).toMatch(/PROTECTED_USER|FORBIDDEN/);
      expect(errCode(await api.call('users.disable', { params: { id: superId }, body: { reason: 'x' } })), `${who} disable`).toMatch(/PROTECTED_USER|FORBIDDEN/);
      expect(errCode(await api.call('users.setRole', { params: { id: superId }, body: { roleKey: 'AGENT' } })), `${who} demote`).toMatch(/PROTECTED_USER|FORBIDDEN/);
    }
    expect(errCode(await admin.call('users.disable', { params: { id: superId }, body: { reason: 'x' } }))).toBe('PROTECTED_USER');
    expect(errCode(await admin.call('users.setRole', { params: { id: superId }, body: { roleKey: 'AGENT' } }))).toBe('PROTECTED_USER');
    expect(errCode(await admin.call('users.create', { body: { email: `dup.${Date.now()}@example.test`, fullName: 'dup', roleKey: 'PRIMARY_SUPER_ADMIN', password: 'Aa1!longEnoughPassw0rd' } }))).toBe('PROTECTED_USER');
    expect(errCode(await admin.call('users.setRole', { params: { id: a2U.id }, body: { roleKey: 'PRIMARY_SUPER_ADMIN' } }))).toBe('PROTECTED_USER');
    expect((await admin.call('auth.me')).status).toBe(200);                    // still alive after all of that
  });

  test('ordinary users cannot see the Primary Super Admin in user lists or audit output', async () => {
    const list = await adm.call('users.list', { query: { pageSize: 100, role: 'PRIMARY_SUPER_ADMIN' } });
    if (list.status === 200) expect(list.body.data.map((u: any) => u.id)).not.toContain(superId);
    else expect(list.status).toBe(403);
  });
});
