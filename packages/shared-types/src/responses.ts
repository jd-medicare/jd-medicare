export interface Rates { processingRate: number; acceptanceRate: number; rejectionRate: number }
export interface OutsourceSummary extends Rates { total: number; accepted: number; rejected: number; pending: number; remaining: number }
export interface CaseDayCounts { date: string; total: number; accepted: number; rejected: number; pending: number }
export interface CeoOperations extends Rates { totalRecords: number; newRecords: number; pending: number; accepted: number; rejected: number }
export interface CeoDashboardData {
  range: { dateFrom: string; dateTo: string };
  operations: CeoOperations;
  people: { activeAgents: number; activeTeamLeaders: number; activeOutsourceUsers: number };
  callLength: { totalSeconds: number; averageSeconds: number; minSeconds: number; maxSeconds: number };
  /** null when the caller lacks finance:view (approved deviation from A9) */
  finance: { totalIncome: string; totalExpenses: string; netPosition: string; currency: string } | null;
  trends: { recordsByDate: CaseDayCounts[]; incomeVsExpenseByMonth: Array<{ month: string; income: string; expenses: string }> };
}
export interface PerformanceRow { userId: string; fullName: string; totalRecords: number; accepted: number; rejected: number; pending: number; averageCallSeconds: number }
export interface FinanceSummary { totalIncome: string; totalExpenses: string; net: string; currency: string }
export interface FinanceTransactionRow {
  id: string; type: 'INCOME' | 'EXPENSE'; date: string; amount: string; currency: string;
  category: string; reference: string | null; status: string;
}
