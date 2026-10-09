// DTO schemas for the screens added after login/outsource. Shapes mirror packages/shared-types (dto.ts, responses.ts, modules/reports.ts).
import { z } from 'zod';
import { CaseDto, CustomerDto } from './index';

export const CustomerCreateResult = z.union([
  z.object({ customer: CustomerDto, case: CaseDto.optional() }),
  CustomerDto.transform((customer) => ({ customer, case: undefined })),
]);
export type CustomerCreateResult = z.infer<typeof CustomerCreateResult>;
export const UserStatus = z.enum(['INVITED', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED']);
export const UserDto = z
  .object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    phone: z.string().nullable().optional(),
    status: UserStatus,
    roleKey: z.string().optional(),
    role: z.string().optional(),
    permissions: z.array(z.string()).nullish().default([]),
    menus: z.array(z.string()).nullish().default([]),
    isPrimarySuperAdmin: z.boolean().optional(),
    lastLoginAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .transform((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone ?? null,
    status: u.status,
    roleKey: u.roleKey || u.role || 'AGENT',
    isPrimarySuperAdmin: Boolean(u.isPrimarySuperAdmin || u.roleKey === 'PRIMARY_SUPER_ADMIN' || u.role === 'PRIMARY_SUPER_ADMIN'),
    permissions: u.permissions ?? [],
    menus: u.menus ?? [],
    lastLoginAt: u.lastLoginAt ?? null,
    createdAt: u.createdAt || '',
  }));
export type UserDto = z.infer<typeof UserDto>;
export const PermissionDto = z.object({
  id: z.string().optional(),
  key: z.string(),
  description: z.string().nullish().default(''),
}).transform((p) => ({
  id: p.id || p.key,
  key: p.key,
  description: p.description || p.key,
}));
export type PermissionDto = z.infer<typeof PermissionDto>;

export const RoleDto = z
  .object({
    id: z.string().optional(),
    key: z.string(),
    name: z.string().optional(),
    permissions: z.array(z.string()).nullish().default([]),
    permissionIds: z.array(z.string()).nullish().default([]),
    menus: z.array(z.string()).nullish().default([]),
    menuIds: z.array(z.string()).nullish().default([]),
  })
  .transform((r) => {
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validMenus = (r.menus && r.menus.length ? r.menus : r.menuIds ?? []).filter((m) => !isUuid(m));
    return {
      id: r.id || r.key,
      key: r.key,
      name: r.name || r.key,
      permissions: (r.permissions && r.permissions.length ? r.permissions : r.permissionIds) ?? [],
      menus: validMenus,
    };
  });
export type RoleDto = z.infer<typeof RoleDto>;

export const MenuDto = z
  .object({
    id: z.string().optional(),
    key: z.string(),
  })
  .transform((m) => ({
    id: m.id || m.key,
    key: m.key,
  }));
export type MenuDto = z.infer<typeof MenuDto>;
export const AuditLogDto = z
  .object({
    id: z.string(),
    event: z.string(),
    actor: z.object({ id: z.string(), fullName: z.string() }).nullable().optional(),
    actorId: z.string().nullable().optional(),
    entityType: z.string(),
    entityId: z.string(),
    at: z.string().optional(),
    createdAt: z.string().optional(),
    requestId: z.string().nullable().optional(),
    before: z.record(z.unknown()).nullable().optional(),
    after: z.record(z.unknown()).nullable().optional(),
  })
  .transform((a) => ({
    id: a.id,
    event: a.event,
    actor: a.actor ?? (a.actorId ? { id: a.actorId, fullName: 'User' } : null),
    entityType: a.entityType,
    entityId: a.entityId,
    at: a.at || a.createdAt || '',
    requestId: a.requestId || '—',
    before: a.before ?? null,
    after: a.after ?? null,
  }));
export type AuditLogDto = z.infer<typeof AuditLogDto>;
const Ref = z.object({ id: z.string(), fullName: z.string() });
const FinanceStatus = z.enum(['ACTIVE', 'VOIDED']);
export const IncomeDto = z
  .object({
    id: z.string(),
    amount: z.union([z.string(), z.number()]).transform(String),
    currency: z.string().nullish().default('PKR'),
    date: z.string(),
    category: z.string(),
    fromDate: z.string().nullable().optional(),
    toDate: z.string().nullable().optional(),
    incomeHeadId: z.string().nullable().optional(),
    incomeHeadName: z.string().optional(),
    incomeHead: z.object({ name: z.string() }).optional(),
    reference: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    relatedCaseId: z.string().nullable().optional(),
    status: FinanceStatus.nullish().default('ACTIVE'),
    createdBy: Ref.optional(),
    createdById: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .transform((i) => ({
    id: i.id,
    amount: i.amount,
    currency: i.currency || 'PKR',
    date: i.date,
    category: i.incomeHeadName || i.incomeHead?.name || i.category,
    fromDate: i.fromDate ?? null,
    toDate: i.toDate ?? null,
    incomeHeadId: i.incomeHeadId ?? null,
    reference: i.reference ?? null,
    description: i.description ?? null,
    relatedCaseId: i.relatedCaseId ?? null,
    status: (i.status || 'ACTIVE') as z.infer<typeof FinanceStatus>,
    createdBy: i.createdBy ?? { id: i.createdById || '', fullName: 'Staff' },
    createdAt: i.createdAt || '',
  }));
export type IncomeDto = z.infer<typeof IncomeDto>;
export const IncomeHeadDto = z.object({ id: z.string(), name: z.string(), isActive: z.boolean().optional() });
export type IncomeHeadDto = z.infer<typeof IncomeHeadDto>;
export const ExpenseDto = z
  .object({
    id: z.string(),
    expenseHeadId: z.string().optional(),
    expenseHeadName: z.string().optional(),
    expenseHead: z.object({ name: z.string() }).optional(),
    amount: z.union([z.string(), z.number()]).transform(String),
    currency: z.string().nullish().default('PKR'),
    date: z.string(),
    payee: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: FinanceStatus.nullish().default('ACTIVE'),
    createdBy: Ref.optional(),
    createdById: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .transform((e) => ({
    id: e.id,
    expenseHeadId: e.expenseHeadId || '',
    expenseHeadName: e.expenseHeadName || e.expenseHead?.name || 'Expense',
    amount: e.amount,
    currency: e.currency || 'PKR',
    date: e.date,
    payee: e.payee ?? null,
    reference: e.reference ?? null,
    description: e.description ?? null,
    status: (e.status || 'ACTIVE') as z.infer<typeof FinanceStatus>,
    createdBy: e.createdBy ?? { id: e.createdById || '', fullName: 'Staff' },
    createdAt: e.createdAt || '',
  }));
export type ExpenseDto = z.infer<typeof ExpenseDto>;
export const ExpenseHeadDto = z.object({ id: z.string(), name: z.string(), isActive: z.boolean() });
export const ExportDto = z
  .object({
    id: z.string(),
    reportType: z.string(),
    format: z.string(),
    status: z.enum(['QUEUED', 'RUNNING', 'READY', 'FAILED']),
    downloadUrl: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
  })
  .transform((e) => ({
    ...e,
    downloadUrl: e.downloadUrl ?? null,
    expiresAt: e.expiresAt ?? null,
  }));
const Bucket = { total: z.number(), accepted: z.number(), rejected: z.number(), pending: z.number() };
// `rows` are only needed for export, so they are not parsed in detail here.
export const OutsourceReport = z.object({
  summary: z.object({
    ...Bucket, remaining: z.number(), processingRate: z.number(), acceptanceRate: z.number(), rejectionRate: z.number(),
    byAgent: z.array(z.object({ ...Bucket, agentId: z.string(), agentName: z.string() })),
    byDate: z.array(z.object({ ...Bucket, date: z.string() })),
  }), rows: z.array(z.unknown()),
});
export const TeamLeaderReport = z.object({
  summary: z.object({
    totalRecords: z.number(), reviewedRecords: z.number(), modifiedRecords: z.number(), accepted: z.number(), rejected: z.number(), pending: z.number(),
    callLength: z.object({ totalSeconds: z.number(), averageSeconds: z.number(), minSeconds: z.number(), maxSeconds: z.number() }),
    byAgent: z.array(z.object({ agentId: z.string(), agentName: z.string(), total: z.number(), averageCallSeconds: z.number() })),
  }), rows: z.array(z.unknown()),
});
export const AdminReport = z.object({
  summary: z.object({
    totalUsers: z.number(), activeUsers: z.number(), lockedUsers: z.number(), totalRecords: z.number(),
    accepted: z.number(), rejected: z.number(), pending: z.number(),
    usersByRole: z.array(z.object({ roleKey: z.string(), count: z.number() })),
  }), rows: z.array(z.unknown()),
});
const Ops = z.object({
  totalRecords: z.number(), newRecords: z.number(), pending: z.number(), accepted: z.number(), rejected: z.number(),
  processingRate: z.number(), acceptanceRate: z.number(), rejectionRate: z.number(),
});
export const CeoDashboard = z.object({
  range: z.object({ dateFrom: z.string(), dateTo: z.string() }),
  operations: Ops,
  people: z.object({ activeAgents: z.number(), activeTeamLeaders: z.number(), activeOutsourceUsers: z.number() }),
  callLength: z.object({ totalSeconds: z.number(), averageSeconds: z.number(), minSeconds: z.number(), maxSeconds: z.number() }),
  finance: z.object({ totalIncome: z.string(), totalExpenses: z.string(), netPosition: z.string(), currency: z.string() }).nullable(),
  trends: z.object({
    recordsByDate: z.array(z.object({ ...Bucket, date: z.string() })),
    incomeVsExpenseByMonth: z.array(z.object({ month: z.string(), income: z.string(), expenses: z.string() })),
  }),
});
export type CeoDashboardDto = z.infer<typeof CeoDashboard>;

