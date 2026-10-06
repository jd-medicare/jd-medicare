import type { ExportFormat, ExportReportType, RoleKey } from './enums';

export interface LoginRequest { email: string; password: string }
export interface MfaVerifyRequest { code: string }
export interface PasswordForgotRequest { email: string }
export interface PasswordResetRequest { token: string; newPassword: string }
export interface CreateUserRequest { email: string; fullName: string; phone?: string; roleKey: RoleKey; password?: string }
export interface UpdateUserRequest { fullName?: string; phone?: string }
export interface SetRoleRequest { roleKey: RoleKey }
export interface SetPermissionsRequest { permissions: string[] }
export interface SetMenusRequest { menus: string[] }
export interface ReasonRequest { reason?: string }
export interface CustomerFields { firstName: string; lastName: string; phone: string; dateOfBirth: string; address: string; zipCode: string; extra?: Record<string, unknown> }
export interface CreateCustomerRequest extends CustomerFields {}
export interface UpdateCustomerRequest extends Partial<CustomerFields> { reason?: string }
export interface UpdateCaseRequest { customer?: Partial<CustomerFields>; expectedVersion: number; reason?: string }
export interface SetCallLengthRequest { durationSeconds: number }
export interface AcceptCaseRequest { confirm: 'CONFIRM' }
export interface RejectCaseRequest { confirm: 'CONFIRM'; reason: string }
export interface ModifyProcessedRequest { confirm: 'CONFIRM'; reason: string; customer?: Partial<CustomerFields>; expectedVersion: number }
export interface ExportCreateRequest { reportType: ExportReportType; format: ExportFormat; filters: Record<string, unknown> }
export interface IncomeCreateRequest { amount: string; currency?: string; date: string; category: string; reference?: string; description?: string; relatedCaseId?: string }
export interface ExpenseCreateRequest { expenseHeadId: string; amount: string; currency?: string; date: string; payee?: string; reference?: string; description?: string }
export interface ExpenseHeadCreateRequest { name: string }
export interface ExpenseHeadUpdateRequest { name?: string; isActive?: boolean }
export interface VoidRequest { reason: string }
export interface UploadUrlRequest { fileName: string; mimeType: string; sizeBytes: number }

export interface LoginResponseData { user: import('./dto').SessionUserDto | null; mfaRequired: boolean }
export interface MfaVerifyResponseData { user: import('./dto').SessionUserDto }
export interface CsrfResponseData { csrfToken: string }
export interface UploadUrlResponseData { fileId: string; uploadUrl: string }
export interface DownloadUrlResponseData { url: string; expiresAt: string }
