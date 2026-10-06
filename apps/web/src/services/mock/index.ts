// Active only when VITE_USE_MOCK=true. Keyed by registry key.
import { ApiError } from '../api-client';
type H = (o: { params?: Record<string, string>; query?: Record<string, unknown>; body?: any }) => unknown;
const user = { id: 'u1', email: 'outsource@example.test', fullName: 'Sana Iqbal', organizationId: 'o1', roleKey: 'OUTSOURCE',
  permissions: ['case:view', 'case:accept', 'case:reject', 'call_length:view', 'report:view'], menus: ['DASHBOARD', 'OUTSOURCE', 'REPORTS'], mfaEnabled: false };
const mk = (i: number) => ({ id: `c${i}`, status: 'PENDING', version: 1, submittedAt: '2026-10-01T08:00:00Z', processedAt: null, processedBy: null, rejectionReason: null,
  agent: { id: 'a1', fullName: 'Agent One' }, teamLeader: { id: 't1', fullName: 'Lead One' },
  customer: { id: `k${i}`, firstName: `Customer${i}`, lastName: 'Test', phone: `+92300000${1000 + i}`, dateOfBirth: '1985-04-12', address: '12 Main Road', zipCode: '25000', extra: {}, createdAt: '2026-10-01T08:00:00Z' },
  callLengthSeconds: 342, callLengthDisplay: '00:05:42' });
const cases: any[] = Array.from({ length: 60 }, (_, i) => mk(i + 1));
const sum = () => { const c = (s: string) => cases.filter((x) => x.status === s).length; const t = cases.length; const r = (n: number) => +((n / t) * 100).toFixed(2);
  return { total: t, accepted: c('ACCEPTED'), rejected: c('REJECTED'), pending: c('PENDING'), remaining: c('PENDING'),
    processingRate: r(t - c('PENDING')), acceptanceRate: r(c('ACCEPTED')), rejectionRate: r(c('REJECTED')) }; };
const process = (id: string, status: string, reason?: string) => {
  const c = cases.find((x) => x.id === id);
  if (c.status !== 'PENDING') throw new ApiError('CASE_ALREADY_PROCESSED', 'processed');
  c.status = status; c.rejectionReason = reason ?? null; c.processedAt = new Date().toISOString(); c.version++; return { data: c };
};
export const mockHandlers: Record<string, H> = {
  'auth.csrf': () => ({ data: { csrfToken: 'mock' } }),
  'auth.login': () => ({ data: { user, mfaRequired: false } }),
  'auth.me': () => ({ data: user }),
  'auth.logout': () => ({ data: null }),
  'outsource.summary': () => ({ data: sum() }),
  'outsource.cases': ({ query = {} }) => {
    const page = Number(query.page ?? 1), size = Number(query.pageSize ?? 25);
    const rows = cases.filter((c) => (!query.phone || c.customer.phone.includes(String(query.phone))) && (!query.status || c.status === query.status));
    return { data: rows.slice((page - 1) * size, page * size), meta: { page, pageSize: size, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / size)) } };
  },
  'cases.accept': ({ params, body }) => { if (body?.confirm !== 'CONFIRM') throw new ApiError('CONFIRMATION_REQUIRED', 'confirm'); return process(params!.id, 'ACCEPTED'); },
  'cases.reject': ({ params, body }) => { if (body?.confirm !== 'CONFIRM') throw new ApiError('CONFIRMATION_REQUIRED', 'confirm'); return process(params!.id, 'REJECTED', body.reason); },
};
