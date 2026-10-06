import { expect } from '@playwright/test';
import crypto from 'node:crypto';
import { Api, isOk, type Res } from './api';
import { optional, required } from './env';

export type RoleKey = 'PRIMARY_SUPER_ADMIN' | 'ADMIN' | 'CEO' | 'TEAM_LEADER' | 'AGENT' | 'OUTSOURCE';
export type TestUser = { id: string; email: string; password: string; roleKey: RoleKey };

export const uid = () => crypto.randomBytes(5).toString('hex');
export const strongPassword = () => `Aa1!${crypto.randomBytes(18).toString('base64url')}`;
/** Unique phone per run so PHONE_ALREADY_EXISTS never interferes. */
export const uniquePhone = () => `+92300${String(crypto.randomInt(0, 1e7)).padStart(7, '0')}`;

export function expectOk(res: Res, what = 'request') {
  expect(isOk(res), `${what} failed: ${res.status} ${res.text.slice(0, 300)}`).toBeTruthy();
}

export async function superAdmin(): Promise<Api> {
  const api = await Api.create();
  const res = await api.login(required('E2E_SUPERADMIN_EMAIL'), required('E2E_SUPERADMIN_PASSWORD'), optional('E2E_SUPERADMIN_TOTP_SECRET'));
  expectOk(res, 'super admin login');
  return api;
}

export async function createUser(admin: Api, roleKey: RoleKey): Promise<TestUser> {
  const tag = uid();
  const password = strongPassword();
  const email = `e2e.${roleKey.toLowerCase()}.${tag}@example.test`;
  const res = await admin.call('users.create', { body: { email, fullName: `E2E ${roleKey} ${tag}`, roleKey, password } });
  expectOk(res, `create ${roleKey}`);
  return { id: res.body.data.id, email, password, roleKey };
}

export async function loginAs(u: TestUser): Promise<Api> {
  const api = await Api.create();
  const res = await api.login(u.email, u.password);
  expectOk(res, `login ${u.roleKey}`);
  return api;
}

export async function disableUsers(admin: Api, users: TestUser[]) {
  for (const u of users) await admin.call('users.disable', { params: { id: u.id }, body: { reason: 'e2e cleanup' } });
}

export function customerBody(over: Record<string, unknown> = {}) {
  const t = uid();
  return {
    firstName: `Test${t}`, lastName: 'Customer', phone: uniquePhone(),
    dateOfBirth: '1985-04-12', address: `${t} Example Street`, zipCode: '25000', extra: {}, ...over,
  };
}

/** Agent submits a customer; returns ids. */
export async function submitCase(agent: Api, over: Record<string, unknown> = {}) {
  const body = customerBody(over);
  const res = await agent.call('customers.create', { body });
  expectOk(res, 'customers.create');
  return { body, customerId: res.body.data.customer.id as string, caseId: res.body.data.case.id as string, res };
}

export async function getCase(api: Api, caseId: string) {
  const r = await api.call('cases.get', { params: { id: caseId } });
  expectOk(r, 'cases.get');
  return r.body.data;
}
