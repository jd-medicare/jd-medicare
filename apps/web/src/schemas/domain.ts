// DTO schemas for the screens added after login/outsource. Shapes mirror packages/shared-types (dto.ts, responses.ts, modules/reports.ts).
import { z } from 'zod';
import { CaseDto, CustomerDto } from './index';

export const CustomerCreateResult = z.object({ customer: CustomerDto, case: CaseDto });
export const UserStatus = z.enum(['INVITED', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED']);
export const UserDto = z.object({
  id: z.string(), email: z.string(), fullName: z.string(), phone: z.string().nullable(), status: UserStatus, roleKey: z.string(),
  permissions: z.array(z.string()), menus: z.array(z.string()), lastLoginAt: z.string().nullable(), createdAt: z.string(),
});
export type UserDto = z.infer<typeof UserDto>;
export const PermissionDto = z.object({ key: z.string(), description: z.string() });
export const AuditLogDto = z.object({
  id: z.string(), event: z.string(), actor: z.object({ id: z.string(), fullName: z.string() }).nullable(), entityType: z.string(),
  entityId: z.string(), at: z.string(), requestId: z.string(),
  before: z.record(z.unknown()).nullable(), after: z.record(z.unknown()).nullable(),
});
const Ref = z.object({ id: z.string(), fullName: z.string() });
const FinanceStatus = z.enum(['ACTIVE', 'VOIDED']);
export const IncomeDto = z.object({
  id: z.string(), amount: z.string(), currency: z.string(), date: z.string(), category: z.string(), reference: z.string().nullable(),
  description: z.string().nullable(), relatedCaseId: z.string().nullable(), status: FinanceStatus, createdBy: Ref, createdAt: z.string(),
});
export const ExpenseDto = z.object({
  id: z.string(), expenseHeadId: z.string(), expenseHeadName: z.string(), amount: z.string(), currency: z.string(), date: z.string(),
  payee: z.string().nullable(), reference: z.string().nullable(), description: z.string().nullable(), status: FinanceStatus,
  createdBy: Ref, createdAt: z.string(),
});
export const ExpenseHeadDto = z.object({ id: z.string(), name: z.string(), isActive: z.boolean() });
export const ExportDto = z.object({
  id: z.string(), reportType: z.string(), format: z.string(), status: z.enum(['QUEUED', 'RUNNING', 'READY', 'FAILED']),
  downloadUrl: z.string().nullable(), expiresAt: z.string().nullable(),
});
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
