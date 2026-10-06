import { test, expect } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { createUser, customerBody, disableUsers, expectOk, getCase, loginAs, superAdmin, type TestUser } from '../helpers/factory';

/** Full lifecycle exactly as specified: Admin creates Agent -> Agent logs in -> submits customer -> Team Leader sees it,
 *  adds Length of Call -> Outsource sees it, searches phone, Accepts with CONFIRM -> ACCEPTED -> dashboard and reports update. */
test.describe.serial('happy path: submit -> review -> accept @smoke', () => {
  let admin: Api, agent: Api, tl: Api, outsource: Api;
  let users: TestUser[] = [];
  let agentU: TestUser, tlU: TestUser, osU: TestUser;
  let body: ReturnType<typeof customerBody>;
  let caseId = '';
  let dashBefore: any;

  test.beforeAll(async () => {
    admin = await superAdmin();
    agentU = await createUser(admin, 'AGENT'); tlU = await createUser(admin, 'TEAM_LEADER'); osU = await createUser(admin, 'OUTSOURCE');
    users = [agentU, tlU, osU];
    // CEO dashboard baseline BEFORE the case exists (super admin holds ceo:dashboard)
    const d = await admin.call('ceo.dashboard', { query: { range: 'TODAY' } });
    expectOk(d, 'ceo.dashboard baseline'); dashBefore = d.body.data;
  });
  test.afterAll(async () => { await disableUsers(admin, users); await Promise.all([admin, agent, tl, outsource].filter(Boolean).map((a) => a.dispose())); });

  test('Admin created the Agent; Agent can log in and sees own profile', async () => {
    agent = await loginAs(agentU);
    const me = await agent.call('auth.me');
    expectOk(me); expect(me.body.data.roleKey).toBe('AGENT'); expect(me.body.data.email).toBe(agentU.email);
    expect(me.body.data.permissions).toEqual(expect.arrayContaining(['customer:create', 'case:create']));
    expect(me.body.data.permissions).not.toContain('case:accept');
  });

  test('Agent submits a customer record -> case is PENDING', async () => {
    body = customerBody();
    const res = await agent.call('customers.create', { body });
    expectOk(res); expect(res.body.data.case.status).toBe('PENDING');
    expect(res.body.data.customer.phone).toBe(body.phone);
    caseId = res.body.data.case.id;
  });

  test('duplicate phone is rejected with PHONE_ALREADY_EXISTS', async () => {
    const dup = await agent.call('customers.create', { body: customerBody({ phone: body.phone }) });
    expect(errCode(dup)).toBe('PHONE_ALREADY_EXISTS');
  });

  test('Team Leader sees the case, adds Length of Call, can edit with optimistic locking', async () => {
    tl = await loginAs(tlU);
    const list = await tl.call('cases.list', { query: { phone: body.phone } });
    expectOk(list); expect(list.body.data.map((c: any) => c.id)).toContain(caseId);

    const set = await tl.call('cases.setCallLength', { params: { id: caseId }, body: { durationSeconds: 342 } });
    expectOk(set);
    const c = await getCase(tl, caseId);
    expect(c.callLengthSeconds).toBe(342); expect(c.callLengthDisplay).toBe('00:05:42');

    const edit = await tl.call('cases.update', { params: { id: caseId }, body: { customer: { address: 'Edited by TL' }, expectedVersion: c.version, reason: 'e2e edit' } });
    expectOk(edit);
    const stale = await tl.call('cases.update', { params: { id: caseId }, body: { customer: { address: 'again' }, expectedVersion: c.version } });
    expect(errCode(stale)).toBe('VERSION_CONFLICT');

    const hist = await tl.call('cases.history', { params: { id: caseId } });
    expectOk(hist);
    const types = hist.body.data.map((h: any) => h.type);
    expect(types).toEqual(expect.arrayContaining(['CREATED', 'CALL_LENGTH', 'EDITED']));
  });

  test('Team Leader can NOT accept or reject', async () => {
    expect(errCode(await tl.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }))).toBe('FORBIDDEN');
    expect(errCode(await tl.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM', reason: 'nope' } }))).toBe('FORBIDDEN');
  });

  test('Outsource sees the case by phone search and its summary counts it as pending', async () => {
    outsource = await loginAs(osU);
    const list = await outsource.call('outsource.cases', { query: { phone: body.phone } });
    expectOk(list); expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].id).toBe(caseId); expect(list.body.data[0].status).toBe('PENDING');
    const sum = await outsource.call('outsource.summary'); expectOk(sum); expect(sum.body.data.pending).toBeGreaterThanOrEqual(1);
  });

  test('Accept requires CONFIRM; with CONFIRM the case becomes ACCEPTED', async () => {
    expect(errCode(await outsource.call('cases.accept', { params: { id: caseId }, body: {} }))).toBe('CONFIRMATION_REQUIRED');
    expect(errCode(await outsource.call('cases.accept', { params: { id: caseId }, body: { confirm: 'confirm' } }))).toBe('CONFIRMATION_REQUIRED');
    expect((await getCase(outsource, caseId)).status).toBe('PENDING');

    const ok = await outsource.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } });
    expectOk(ok);
    const c = await getCase(outsource, caseId);
    expect(c.status).toBe('ACCEPTED'); expect(c.processedAt).not.toBeNull(); expect(c.processedBy.id).toBe(osU.id);
    const hist = await outsource.call('cases.history', { params: { id: caseId } });
    expect(hist.body.data.map((h: any) => h.type)).toContain('ACCEPTED');
  });

  test('second Accept / Reject on a processed case is refused', async () => {
    const again = await outsource.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } });
    expect(['CASE_ALREADY_PROCESSED', 'INVALID_STATUS_TRANSITION']).toContain(errCode(again));
    const rej = await outsource.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM', reason: 'late' } });
    expect(['CASE_ALREADY_PROCESSED', 'INVALID_STATUS_TRANSITION']).toContain(errCode(rej));
    expect((await getCase(outsource, caseId)).status).toBe('ACCEPTED');
  });

  test('reports and CEO dashboard reflect the new ACCEPTED case', async () => {
    const rep = await outsource.call('reports.outsource', { query: { phone: body.phone } });
    expectOk(rep); expect(rep.body.data.rows).toHaveLength(1); expect(rep.body.data.rows[0].status).toBe('ACCEPTED');
    expect(rep.body.data.summary.accepted).toBeGreaterThanOrEqual(1);

    const tlRep = await tl.call('reports.teamLeader', { query: { phone: body.phone } });
    expectOk(tlRep); expect(tlRep.body.data.summary.callLength.totalSeconds).toBeGreaterThanOrEqual(342);

    const d = await admin.call('ceo.dashboard', { query: { range: 'TODAY' } });
    expectOk(d);
    const a = dashBefore.operations, b = d.body.data.operations;       // >= (not ==) because staging may see other traffic
    expect(b.totalRecords).toBeGreaterThanOrEqual(a.totalRecords + 1);
    expect(b.accepted).toBeGreaterThanOrEqual(a.accepted + 1);
    expect(b.processingRate).toBeGreaterThanOrEqual(0); expect(b.processingRate).toBeLessThanOrEqual(100);
    expect(d.body.data.callLength.totalSeconds).toBeGreaterThanOrEqual(dashBefore.callLength.totalSeconds + 342);
  });
});
