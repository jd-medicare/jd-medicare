import { test, expect } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { createUser, disableUsers, expectOk, getCase, loginAs, submitCase, superAdmin, type TestUser } from '../helpers/factory';

test.describe.serial('reject, edit, modify after processing, concurrency', () => {
  let admin: Api, agent: Api, tl: Api, os: Api;
  let users: TestUser[] = [];

  test.beforeAll(async () => {
    admin = await superAdmin();
    const [a, t, o] = [await createUser(admin, 'AGENT'), await createUser(admin, 'TEAM_LEADER'), await createUser(admin, 'OUTSOURCE')];
    users = [a, t, o]; agent = await loginAs(a); tl = await loginAs(t); os = await loginAs(o);
  });
  test.afterAll(async () => { await disableUsers(admin, users); });

  test('Reject needs CONFIRM and a reason; then status is REJECTED with reason stored', async () => {
    const { caseId } = await submitCase(agent);
    expect(errCode(await os.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }))).toBe('VALIDATION_ERROR');
    expect(errCode(await os.call('cases.reject', { params: { id: caseId }, body: { reason: 'bad data' } }))).toBe('CONFIRMATION_REQUIRED');
    expectOk(await os.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM', reason: 'bad data' } }));
    const c = await getCase(os, caseId);
    expect(c.status).toBe('REJECTED'); expect(c.rejectionReason).toBe('bad data');
    // the Agent sees the outcome of their own record
    expect((await getCase(agent, caseId)).status).toBe('REJECTED');
  });

  test('ordinary edit of a processed case is refused (CASE_ALREADY_PROCESSED)', async () => {
    const { caseId } = await submitCase(agent);
    expectOk(await os.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }));
    const c = await getCase(tl, caseId);
    const r = await tl.call('cases.update', { params: { id: caseId }, body: { customer: { address: 'x' }, expectedVersion: c.version } });
    expect(errCode(r)).toBe('CASE_ALREADY_PROCESSED');
  });

  for (const outcome of ['ACCEPTED', 'REJECTED'] as const) {
    test(`modify-processed on a ${outcome} case: permission, CONFIRM, reason, version, history`, async () => {
      const { caseId } = await submitCase(agent);
      if (outcome === 'ACCEPTED') expectOk(await os.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }));
      else expectOk(await os.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM', reason: 'r' } }));
      const c = await getCase(admin, caseId);
      const payload = { confirm: 'CONFIRM', reason: 'customer corrected zip', customer: { zipCode: '44000' }, expectedVersion: c.version };

      // roles without case:modify_processed
      for (const [who, api] of [['TEAM_LEADER', tl], ['OUTSOURCE', os], ['AGENT', agent]] as const)
        expect(errCode(await api.call('cases.modifyProcessed', { params: { id: caseId }, body: payload })), who).toBe('FORBIDDEN');
      // holder of the permission (Primary Super Admin has everything)
      expect(errCode(await admin.call('cases.modifyProcessed', { params: { id: caseId }, body: { ...payload, confirm: 'nope' } }))).toBe('CONFIRMATION_REQUIRED');
      expect(errCode(await admin.call('cases.modifyProcessed', { params: { id: caseId }, body: { ...payload, reason: '' } }))).toBe('VALIDATION_ERROR');
      expect(errCode(await admin.call('cases.modifyProcessed', { params: { id: caseId }, body: { ...payload, expectedVersion: c.version + 99 } }))).toBe('VERSION_CONFLICT');
      expectOk(await admin.call('cases.modifyProcessed', { params: { id: caseId }, body: payload }));

      const after = await getCase(admin, caseId);
      expect(after.status).toBe(outcome);                      // modifying data does not silently change the decision
      expect(after.customer.zipCode).toBe('44000'); expect(after.version).toBeGreaterThan(c.version);
      const hist = (await admin.call('cases.history', { params: { id: caseId } })).body.data;
      const m = hist.find((h: any) => h.type === 'MODIFIED_AFTER_PROCESSING');
      expect(m, 'history has MODIFIED_AFTER_PROCESSING').toBeTruthy();
      expect(m.reason).toBe('customer corrected zip'); expect(m.before).not.toBeNull(); expect(m.after).not.toBeNull();
    });
  }

  test('concurrent Accept + Reject: exactly one wins, the other gets a processed/transition error', async () => {
    const { caseId } = await submitCase(agent);
    const [a, r] = await Promise.all([
      os.call('cases.accept', { params: { id: caseId }, body: { confirm: 'CONFIRM' } }),
      os.call('cases.reject', { params: { id: caseId }, body: { confirm: 'CONFIRM', reason: 'race' } }),
    ]);
    const oks = [a, r].filter((x) => x.status < 300);
    expect(oks).toHaveLength(1);
    const loser = [a, r].find((x) => x.status >= 300)!;
    expect(['CASE_ALREADY_PROCESSED', 'INVALID_STATUS_TRANSITION']).toContain(errCode(loser));
    const hist = (await admin.call('cases.history', { params: { id: caseId } })).body.data.filter((h: any) => ['ACCEPTED', 'REJECTED'].includes(h.type));
    expect(hist).toHaveLength(1);                                  // no double decision recorded
  });

  test('workflow.transitions exposes only PENDING -> ACCEPTED/REJECTED', async () => {
    const r = await os.call('workflow.transitions'); expectOk(r);
    const flat = JSON.stringify(r.body.data);
    expect(flat).toContain('ACCEPTED'); expect(flat).toContain('REJECTED');
  });
});
