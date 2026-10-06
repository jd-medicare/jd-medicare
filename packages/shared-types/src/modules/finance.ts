// Account 6: finance, files, integrations, notifications shared types.
// Money values are ALWAYS strings ("1250.50"). Dates are "YYYY-MM-DD". Timestamps are ISO 8601 UTC.

export type FinanceStatus = 'ACTIVE' | 'VOIDED';
export type FinancialTransactionType = 'INCOME' | 'EXPENSE';

export interface UserRefDto {
  id: string;
  fullName: string;
}

export interface IncomeDto {
  id: string;
  amount: string;
  currency: string;
  date: string;
  category: string;
  reference: string | null;
  description: string | null;
  relatedCaseId: string | null;
  status: FinanceStatus;
  createdBy: UserRefDto;
  createdAt: string;
}

export interface ExpenseDto {
  id: string;
  expenseHeadId: string;
  expenseHeadName: string;
  amount: string;
  currency: string;
  date: string;
  payee: string | null;
  reference: string | null;
  description: string | null;
  status: FinanceStatus;
  createdBy: UserRefDto;
  createdAt: string;
}

export interface ExpenseHeadDto {
  id: string;
  name: string;
  isActive: boolean;
}

export interface IncomeCreateBody {
  amount: string;
  currency?: string;
  date: string;
  category: string;
  reference?: string;
  description?: string;
  relatedCaseId?: string;
}

/** Partial update. Contract A8 defines no update body; these are the editable fields. */
export type IncomeUpdateBody = Partial<IncomeCreateBody>;

export interface ExpenseCreateBody {
  expenseHeadId: string;
  amount: string;
  currency?: string;
  date: string;
  payee?: string;
  reference?: string;
  description?: string;
}

export type ExpenseUpdateBody = Partial<ExpenseCreateBody>;

export interface ExpenseHeadCreateBody {
  name: string;
}

export interface ExpenseHeadUpdateBody {
  name?: string;
  isActive?: boolean;
}

export interface VoidBody {
  reason: string;
}

export interface FinanceSummaryDto {
  totalIncome: string;
  totalExpenses: string;
  net: string;
  currency: string;
}

export interface FinanceByCategoryDto {
  income: Array<{ category: string; total: string }>;
  expenses: Array<{ expenseHeadId: string; expenseHeadName: string; total: string }>;
}

export interface FinanceMonthlyDto {
  month: string; // "YYYY-MM"
  income: string;
  expenses: string;
  net: string;
}

export interface FinanceTransactionDto {
  id: string;
  type: FinancialTransactionType;
  date: string;
  amount: string;
  currency: string;
  category: string;
  reference: string | null;
  status: FinanceStatus;
}

// ---- Files ----
export interface UploadUrlBody {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface UploadUrlDto {
  fileId: string;
  uploadUrl: string;
}
export interface DownloadUrlDto {
  url: string;
  expiresAt: string;
}
