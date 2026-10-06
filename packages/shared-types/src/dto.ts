import type { CaseStatus, ExportFormat, ExportReportType, ExportStatus, FinanceStatus, RoleKey, UserStatus } from './enums';

export interface ApiMeta { page: number; pageSize: number; total: number; totalPages: number }
export interface ApiSuccess<T> { data: T; meta?: ApiMeta }
export interface ApiErrorBody { error: { code: string; message: string; requestId: string } }
export interface UserRef { id: string; fullName: string }

export interface SessionUserDto {
  id: string; email: string; fullName: string; organizationId: string; roleKey: RoleKey;
  permissions: string[]; menus: string[]; mfaEnabled: boolean;
}
export interface UserDto {
  id: string; email: string; fullName: string; phone: string | null; status: UserStatus; roleKey: RoleKey;
  permissions: string[]; menus: string[]; lastLoginAt: string | null; createdAt: string;
}
export interface CustomerDto {
  id: string; firstName: string; lastName: string; phone: string;
  dateOfBirth: string | null; address: string | null; zipCode: string;
  extra: Record<string, unknown>; createdAt: string;
}
export interface CaseDto {
  id: string; status: CaseStatus; version: number; submittedAt: string; processedAt: string | null;
  processedBy: UserRef | null; rejectionReason: string | null; agent: UserRef; teamLeader: UserRef | null;
  customer: CustomerDto; callLengthSeconds: number | null; callLengthDisplay: string | null;
}
export interface CaseHistoryItemDto {
  id: string; type: 'CREATED' | 'EDITED' | 'CALL_LENGTH' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED_AFTER_PROCESSING';
  actor: UserRef; at: string; reason: string | null;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
}
export interface AuditLogDto {
  id: string; event: string; actor: UserRef | null; entityType: string; entityId: string; at: string;
  requestId: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null;
}
export interface IncomeDto {
  id: string; amount: string; currency: string; date: string; category: string; reference: string | null;
  description: string | null; relatedCaseId: string | null; status: FinanceStatus; createdBy: UserRef; createdAt: string;
}
export interface ExpenseDto {
  id: string; expenseHeadId: string; expenseHeadName: string; amount: string; currency: string; date: string;
  payee: string | null; reference: string | null; description: string | null; status: FinanceStatus;
  createdBy: UserRef; createdAt: string;
}
export interface ExpenseHeadDto { id: string; name: string; isActive: boolean }
export interface ExportDto {
  id: string; reportType: ExportReportType; format: ExportFormat; status: ExportStatus;
  downloadUrl: string | null; expiresAt: string | null;
}
/** Account 1 additions for endpoints whose payload the contract leaves open (documented in README). */
export interface RoleDto { key: RoleKey; name: string; permissions: string[]; menus: string[] }
export interface PermissionDto { key: string; description: string }
export interface MenuDto { key: string }
export interface OrganizationDto { id: string; name: string; slug: string; baseCurrency: string }
