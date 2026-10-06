import { test, expect } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { createUser, disableUsers, loginAs, superAdmin, type RoleKey, type TestUser } from '../helpers/factory';

// ASVS V4 (access control): default-deny matrix per role, checked against the contract's default permissions.
const ZERO = '00000000-0000-4000-8000-000000000000';
type Probe = [key: string, opts?: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown }];
const id = { id: ZERO };
const FIN: Probe[] = [['finance.incomeList'], ['finance.incomeCreate', { body: { amount: '1.00', date: '2025-01-01', category: 'x' } }], ['finance.expenseList'],
  ['finance.expenseCreate', { body: { expenseHeadId: ZERO, amount: '1.00', date: '2025-01-01' } }], ['finance.expenseHeadCreate', { body: { name: 'x' } }],
  ['finance.reportSummary'], ['finance.transactions'], ['finance.incomeVoid', { params: id, body: { reason: 'x' } }]];
const CEO: Probe[] = [['ceo.dashboard', { query: { range: 'TODAY' } }], ['ceo.compare'], ['ceo.performanceAgents']];
const ADMINISTRATION: Probe[] = [['users.list'], ['users.create', { body: { email: 'a@example.test', fullName: 'x', roleKey: 'AGENT' } }], ['users.setRole', { params: id, body: { roleKey: 'ADMIN' } }],
  ['users.setPermissions', { params: id, body: { permissions: [] } }], ['audit.list'], ['reports.admin']];
const DECISIONS: Probe[] = [['cases.accept', { params: id, body: { confirm: 'CONFIRM' } }], ['cases.reject', { params: id, body: { confirm: 'CONFIRM', reason: 'x' } }],
  ['cases.modifyProcessed', { params: id, body: { confirm: 'CONFIRM', reason: 'x', expectedVersion: 1 } }]];
const EXPORT: Probe[] = [['reports.exportCreate', { body: { reportType: 'OUTSOURCE', format: 'CSV', filters: {} } }]];

const MATRIX: Record<string, Probe[]> = {
  AGENT: [...ADMINISTRATION, ...FIN, ...CEO, ...DECISIONS, ...EXPORT, ['cases.setCallLength', { params: id, body: { durationSeconds: 1 } }], ['outsource.cases'], ['outsource.summary'], ['reports.teamLeader'], ['reports.outsource']],
  TEAM_LEADER: [...ADMINISTRATION, ...FIN, ...CEO, ...DECISIONS, ...EXPORT, ['customers.create', { body: {} }]],
  OUTSOURCE: [...ADMINISTRATION, ...FIN, ...CEO, ...EXPORT, ['customers.create', { body: {} }], ['customers.update', { params: id, body: {} }], ['cases.update', { params: id, body: { expectedVersion: 1 } }],
    ['cases.setCallLength', { params: id, body: { durationSeconds: 1 } }], ['cases.modifyProcessed', { params: id, body: { confirm: 'CONFIRM', reason: 'x', expectedVersion: 1 } }]],
  ADMIN: [...FIN, ...CEO, ...DECISIONS, ['users.setRole', { params: id, body: { roleKey: 'ADMIN' } }], ['users.setPermissions', { params: id, body: { permissions: [] } }], ['audit.list']],
  CEO: [['users.create', { body: { email: 'a@example.test', fullName: 'x', roleKey: 'AGENT' } }], ['users.setRole', { params: id, body: { roleKey: 'ADMIN' } }], ...DECISIONS, ['customers.create', { body: {} }]],
};

test.describe('role matrix: forbidden by default (ASVS 4.1.x, 4.2.1)', () => {
  let admin: Api; const users: TestUser[] = []; const apis: Record<string, Api> = {};
  test.beforeAll(async () => {
    admin = await superAdmin();
    for (const role of Object.keys(MATRIX) as RoleKey[]) { const u = await createUser(admin, role); users.push(u); apis[role] = await loginAs(u); }
  });
  test.afterAll(async () => { await disableUsers(admin, users); });

  for (const [role, probes] of Object.entries(MATRIX)) {
    test(`${role}: ${probes.length} forbidden calls return FORBIDDEN`, async () => {
      const failures: string[] = [];
      for (const [key, o] of probes) {
        const res = await apis[role].call(key, o);
        // authorization MUST run before resource lookup, so a random id gives FORBIDDEN, not NOT_FOUND (no existence oracle)
        if (res.status !== 403 || errCode(res) !== 'FORBIDDEN') failures.push(`${key} -> ${res.status} ${errCode(res)}`);
      }
      expect(failures, `${role} reached endpoints it must not:\n${failures.join('\n')}`).toEqual([]);
    });
  }
});
