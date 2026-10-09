export const ROLE_KEYS = ['PRIMARY_SUPER_ADMIN', 'ADMIN', 'CEO', 'TEAM_LEADER', 'AGENT', 'OUTSOURCE'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const PERMISSIONS = [
  'user:create', 'user:view', 'user:update', 'user:lock', 'user:unlock',
  'role:manage', 'permission:manage', 'menu:manage',
  'customer:create', 'customer:view', 'customer:update',
  'case:create', 'case:view', 'case:update', 'case:accept', 'case:reject', 'case:modify_processed',
  'call_length:view', 'call_length:create', 'call_length:update',
  'report:view', 'report:export',
  'finance:view', 'income:create', 'income:update', 'expense:create', 'expense:update',
  'expense_head:create', 'expense_head:update',
  'ceo:dashboard', 'audit:view',
] as const;
export type PermissionKey = (typeof PERMISSIONS)[number];

export const MENUS = ['DASHBOARD', 'CUSTOMERS', 'CASES', 'OUTSOURCE', 'REPORTS', 'FINANCE', 'EXPENSES', 'CEO', 'ADMINISTRATION'] as const;
export type MenuKey = (typeof MENUS)[number];

export const CASE_STATUSES = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export const USER_STATUSES = ['INVITED', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
export const FINANCE_STATUSES = ['ACTIVE', 'VOIDED'] as const;
export type FinanceStatus = (typeof FINANCE_STATUSES)[number];
export const EXPORT_STATUSES = ['QUEUED', 'RUNNING', 'READY', 'FAILED'] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];
export const EXPORT_FORMATS = ['CSV', 'XLSX', 'PDF'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export const EXPORT_REPORT_TYPES = ['OUTSOURCE', 'TEAM_LEADER', 'ADMIN', 'FINANCE'] as const;
export type ExportReportType = (typeof EXPORT_REPORT_TYPES)[number];
export const CEO_RANGES = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'PREVIOUS_MONTH', 'YEAR_TO_DATE', 'CUSTOM'] as const;
export type CeoRange = (typeof CEO_RANGES)[number];

export const ERROR_CODES = [
  'UNAUTHENTICATED', 'FORBIDDEN', 'VALIDATION_ERROR', 'NOT_FOUND', 'PHONE_ALREADY_EXISTS',
  'CONFIRMATION_REQUIRED', 'INVALID_STATUS_TRANSITION', 'CASE_ALREADY_PROCESSED', 'ACCOUNT_LOCKED',
  'RATE_LIMITED', 'VERSION_CONFLICT', 'PROTECTED_USER', 'MFA_REQUIRED', 'INVALID_CREDENTIALS',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** HTTP status used for each error code (ASSUMPTION: the contract names codes, not statuses). */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401, FORBIDDEN: 403, VALIDATION_ERROR: 400, NOT_FOUND: 404,
  PHONE_ALREADY_EXISTS: 409, CONFIRMATION_REQUIRED: 400, INVALID_STATUS_TRANSITION: 409,
  CASE_ALREADY_PROCESSED: 409, ACCOUNT_LOCKED: 423, RATE_LIMITED: 429, VERSION_CONFLICT: 409,
  PROTECTED_USER: 403, MFA_REQUIRED: 403, INVALID_CREDENTIALS: 401,
};

export const AUDIT_EVENTS = [
  'LOGIN', 'LOGIN_FAILED', 'USER_CREATED', 'USER_LOCKED', 'USER_UNLOCKED', 'PERMISSION_CHANGED',
  'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CASE_CREATED', 'CASE_UPDATED', 'CALL_LENGTH_UPDATED',
  'CASE_ACCEPTED', 'CASE_REJECTED', 'CASE_MODIFIED', 'INCOME_CREATED', 'EXPENSE_CREATED',
  'REPORT_CREATED', 'EXPORT_CREATED',
] as const;
export type AuditEvent = (typeof AUDIT_EVENTS)[number];

const P = PERMISSIONS;
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  AGENT: ['customer:create', 'customer:view'],
  TEAM_LEADER: ['customer:view', 'customer:update', 'case:view', 'case:update', 'call_length:view', 'call_length:create', 'call_length:update', 'report:view'],
  OUTSOURCE: ['case:view', 'case:accept', 'case:reject', 'call_length:view', 'report:view'],
  ADMIN: ['user:create', 'user:view', 'user:update', 'user:lock', 'user:unlock', 'menu:manage', 'report:view'],
  CEO: ['ceo:dashboard', 'report:view', 'report:export', 'finance:view', 'income:create', 'income:update', 'expense:create', 'expense:update', 'expense_head:create', 'expense_head:update'],
  PRIMARY_SUPER_ADMIN: P,
};

/** ASSUMPTION: the contract lists menus but not per-role defaults; these are the defaults seeded. */
export const DEFAULT_ROLE_MENUS: Record<RoleKey, readonly MenuKey[]> = {
  AGENT: ['CUSTOMERS'],
  TEAM_LEADER: ['DASHBOARD', 'CUSTOMERS', 'CASES', 'REPORTS'],
  OUTSOURCE: ['DASHBOARD', 'OUTSOURCE', 'REPORTS'],
  ADMIN: ['DASHBOARD', 'REPORTS', 'ADMINISTRATION'],
  CEO: ['DASHBOARD', 'REPORTS', 'FINANCE', 'EXPENSES', 'CEO'],
  PRIMARY_SUPER_ADMIN: MENUS,
};

/** Hierarchy used by the privilege-escalation rules (ASSUMPTION, documented). */
export const ROLE_RANK: Record<RoleKey, number> = {
  PRIMARY_SUPER_ADMIN: 100, ADMIN: 80, CEO: 70, TEAM_LEADER: 50, OUTSOURCE: 30, AGENT: 20,
};
