// Account 3. Mirrors contract A7/A9. ReportCaseDto/ReportUserDto are structurally identical to
// CaseDto/UserDto (A7); they are named separately so this file has no dependency on other modules.

export type ReportType = 'OUTSOURCE' | 'TEAM_LEADER' | 'ADMIN' | 'FINANCE';
export type ExportFormat = 'CSV' | 'XLSX' | 'PDF';
export type ExportStatus = 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED';
export type CeoRange = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'PREVIOUS_MONTH' | 'YEAR_TO_DATE' | 'CUSTOM';
export type CaseStatus = 'SUBMITTED' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type UserStatus = 'INVITED' | 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'DISABLED';
export type RoleKey = 'PRIMARY_SUPER_ADMIN' | 'ADMIN' | 'CEO' | 'TEAM_LEADER' | 'AGENT' | 'OUTSOURCE';

export interface PageMeta { page: number; pageSize: number; total: number; totalPages: number }
export interface ListResponse<T> { data: T; meta: PageMeta }

export interface ReportCustomerDto {
  id: string; firstName: string; lastName: string; phone: string;
  dateOfBirth: string | null; address: string | null; zipCode: string;
  extra: Record<string, unknown>; createdAt: string;
}
export interface ReportCaseDto {
  id: string; status: CaseStatus; version: number; submittedAt: string; processedAt: string | null;
  processedBy: { id: string; fullName: string } | null; rejectionReason: string | null;
  agent: { id: string; fullName: string }; teamLeader: { id: string; fullName: string } | null;
  customer: ReportCustomerDto; callLengthSeconds: number | null; callLengthDisplay: string | null;
}
export interface ReportUserDto {
  id: string; email: string; fullName: string; phone: string | null; status: UserStatus; roleKey: RoleKey;
  permissions: string[]; menus: string[]; lastLoginAt: string | null; createdAt: string;
}

export interface StatusBucket { total: number; accepted: number; rejected: number; pending: number }
export interface OutsourceReportSummary extends StatusBucket {
  remaining: number; processingRate: number; acceptanceRate: number; rejectionRate: number;
  byAgent: Array<StatusBucket & { agentId: string; agentName: string }>;
  byDate: Array<StatusBucket & { date: string }>;
}
export interface CallLengthStats { totalSeconds: number; averageSeconds: number; minSeconds: number; maxSeconds: number }
export interface TeamLeaderReportSummary {
  totalRecords: number; reviewedRecords: number; modifiedRecords: number;
  accepted: number; rejected: number; pending: number; callLength: CallLengthStats;
  byAgent: Array<{ agentId: string; agentName: string; total: number; averageCallSeconds: number }>;
}
export interface AdminReportSummary {
  totalUsers: number; activeUsers: number; lockedUsers: number;
  usersByRole: Array<{ roleKey: RoleKey; count: number }>;
  totalRecords: number; accepted: number; rejected: number; pending: number;
}
export interface OutsourceReportData { summary: OutsourceReportSummary; rows: ReportCaseDto[] }
export interface TeamLeaderReportData { summary: TeamLeaderReportSummary; rows: ReportCaseDto[] }
export interface AdminReportData { summary: AdminReportSummary; rows: ReportUserDto[] }

export interface OperationsBlock {
  totalRecords: number; newRecords: number; pending: number; accepted: number; rejected: number;
  processingRate: number; acceptanceRate: number; rejectionRate: number;
}
export interface CeoDashboardData {
  range: { dateFrom: string; dateTo: string };
  operations: OperationsBlock;
  people: { activeAgents: number; activeTeamLeaders: number; activeOutsourceUsers: number };
  callLength: CallLengthStats;
  /** null when the caller lacks finance:view (deviation from A9, see CHANGE_REQUESTS.md) */
  finance: { totalIncome: string; totalExpenses: string; netPosition: string; currency: string } | null;
  trends: {
    recordsByDate: Array<StatusBucket & { date: string }>;
    incomeVsExpenseByMonth: Array<{ month: string; income: string; expenses: string }>;
  };
}
export interface PerformanceRowDto {
  userId: string; fullName: string; totalRecords: number; accepted: number; rejected: number;
  pending: number; averageCallSeconds: number;
}
export interface CeoCompareData { periodA: OperationsBlock; periodB: OperationsBlock }

export interface ExportCreateRequest { reportType: ReportType; format: ExportFormat; filters?: Record<string, string | number> }
export interface ExportDto {
  id: string; reportType: ReportType; format: ExportFormat; status: ExportStatus;
  downloadUrl: string | null; expiresAt: string | null;
}
