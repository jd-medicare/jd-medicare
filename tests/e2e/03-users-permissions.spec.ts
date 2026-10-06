import { test, expect } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { createUser, disableUsers, expectOk, loginAs, submitCase, superAdmin, type TestUser } from '../helpers/factory';

test.describe.serial('user lifecycle, lock/unlock, permission removal', () => {
  let admin: Api, agent: Api, os: Api;
  let agentU: TestUser, osU: TestUser;

  test.beforeAll(async () => {
    admin = await superAdmin();
    agentU = await createUser(admin, 'AGENT'); osU = await createUser(admin, 'OUTSOURCE');
    agent = await loginAs(agentU); os = await loginAs(osU);
  });
  test.afterAll(async () => { await disableUsers(admin, [agentU, osU]); });

  test('lock: new logins fail with ACCOUNT_LOCKED and the live session stops working; unlock restores access', async () => {
    expectOk(await admin.call('users.lock', { params: { id: agentU.id }, body: { reason: 'e2e' } }));
    const fresh = await Api.create();
    expect(errCode(await fresh.login(agentU.email, agentU.password))).toBe('ACCOUNT_LOCKED');
    const live = await agent.call('auth.me');
    expect(live.status, 'existing session of a locked user must not stay valid').toBeGreaterThanOrEqual(401);

    expectOk(await admin.call('users.unlock', { params: { id: agentU.id }, body: { reason: 'e2e' } }));
    const again = await Api.create(); expectOk(await again.login(agentU.email, agentU.password));
    expect((await again.call('auth.me')).body.data.id).toBe(agentU.id);
    agent = again;
  });

  test('disable blocks login; activate re-enables it', async () => {
    expectOk(await admin.call('users.disable', { params: { id: agentU.id }, body: { reason: 'e2e' } }));
    expect((await (await Api.create()).login(agentU.email, agentU.password)).status).toBeGreaterThanOrEqual(400);
    expectOk(await admin.call('users.activate', { params: { id: agentU.id }, body: { reason: 'e2e' } }));
    const ok = await Api.create(); expectOk(await ok.login(agentU.email, agentU.password)); agent = ok;
  });

  test('removing case:accept from an Outsource user takes effect immediately (server-side)', async () => {
    const { caseId } = await submitCase(agent);
    const kept = ['case:view', 'case:reject', 'call_length:view', 'report:view'];
    expectOk(await admin.call('users.setPermissions', { params: { id: osU.id }, body: { permissions: kept } }));
    expect(errCode(await os.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }))).toBe('FORBIDDEN');
    expect((await os.call('cases.get', { params: { id: caseId } })).status).toBe(200);          // view still works
    expectOk(await admin.call('users.setPermissions', { params: { id: osU.id }, body: { permissions: [...kept, 'case:accept'] } }));
    expectOk(await os.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }));
  });

  test('menus and role changes are reflected in auth.me; changes are audited', async () => {
    expectOk(await admin.call('users.setMenus', { params: { id: osU.id }, body: { menus: ['DASHBOARD', 'OUTSOURCE'] } }));
    const me = await os.call('auth.me'); expectOk(me);
    expect(me.body.data.menus.sort()).toEqual(['DASHBOARD', 'OUTSOURCE']);

    const audit = await admin.call('audit.list', { query: { search: osU.id, pageSize: 100, sort: 'at:desc' } });
    expectOk(audit);
    const events = audit.body.data.filter((e: any) => e.entityId === osU.id).map((e: any) => e.event);
    expect(events).toEqual(expect.arrayContaining(['USER_CREATED', 'PERMISSION_CHANGED']));
  });

  test('audit trail records LOCK/UNLOCK for the agent and never exposes passwords', async () => {
    const audit = await admin.call('audit.list', { query: { search: agentU.id, pageSize: 100 } }); expectOk(audit);
    const events = audit.body.data.map((e: any) => e.event);
    expect(events).toEqual(expect.arrayContaining(['USER_LOCKED', 'USER_UNLOCKED']));
    expect(JSON.stringify(audit.body)).not.toContain(agentU.password);
  });
});
