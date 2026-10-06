// Account 2 - case workflow types shared with the frontend. Pure TS, no runtime deps.

export type CaseStatus = 'SUBMITTED' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
export const CASE_STATUSES: readonly CaseStatus[] = ['SUBMITTED', 'PENDING', 'ACCEPTED', 'REJECTED'];

export type CaseHistoryType =
  | 'CREATED'
  | 'EDITED'
  | 'CALL_LENGTH'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'MODIFIED_AFTER_PROCESSING';

/** Actions of the workflow transition table (see apps/api/src/workflow/transition-table.ts). */
export type CaseAction = 'CREATE' | 'QUEUE' | 'ACCEPT' | 'REJECT' | 'MODIFY_PROCESSED';

export interface UserRefDto {
  id: string;
  fullName: string;
}

export interface CustomerDto {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** null when the caller lacks customer:view */
  dateOfBirth: string | null;
  /** null when the caller lacks customer:view */
  address: string | null;
  zipCode: string;
  /** {} when the caller lacks customer:view */
  extra: Record<string, unknown>;
  createdAt: string;
}

export interface CaseDto {
  id: string;
  status: CaseStatus;
  version: number;
  submittedAt: string;
  processedAt: string | null;
  processedBy: UserRefDto | null;
  rejectionReason: string | null;
  agent: UserRefDto;
  teamLeader: UserRefDto | null;
  customer: CustomerDto;
  /** null when no call length is set OR the caller lacks call_length:view */
  callLengthSeconds: number | null;
  callLengthDisplay: string | null;
}

export interface CaseHistoryItemDto {
  id: string;
  type: CaseHistoryType;
  actor: UserRefDto;
  at: string;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface CustomerFieldsInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  zipCode?: string;
  extra?: Record<string, unknown>;
}

export interface CustomerCreateBody {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  zipCode: string;
  extra?: Record<string, unknown>;
}
export interface CustomerUpdateBody extends CustomerFieldsInput {
  reason?: string;
}
export interface CustomerCreateResult {
  customer: CustomerDto;
  case: CaseDto;
}
export interface CaseUpdateBody {
  customer?: CustomerFieldsInput;
  expectedVersion: number;
  reason?: string;
}
export interface CallLengthBody {
  durationSeconds: number;
}
export interface AcceptBody {
  confirm: 'CONFIRM';
}
export interface RejectBody {
  confirm: 'CONFIRM';
  reason: string;
}
export interface ModifyProcessedBody {
  confirm: 'CONFIRM';
  reason: string;
  customer?: CustomerFieldsInput;
  expectedVersion: number;
}

export interface WorkflowTransitionDto {
  action: CaseAction;
  from: CaseStatus | null;
  to: CaseStatus;
  /** true = executed by the system, cannot be requested through the API */
  automatic: boolean;
  requiredPermission: string | null;
  requiresConfirmation: boolean;
  requiresReason: boolean;
}

export interface OutsourceSummaryDto {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  remaining: number;
  processingRate: number;
  acceptanceRate: number;
  rejectionRate: number;
}

// ---------------------------------------------------------------------------
// Helpers (the SINGLE definition of these formulas - reuse them, do not re-derive)
// ---------------------------------------------------------------------------

/** Seconds -> "HH:MM:SS". Hours are not capped at 99 (e.g. 100:00:00). Invalid input throws. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isInteger(totalSeconds) || totalSeconds < 0) {
    throw new RangeError('durationSeconds must be a non-negative integer');
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

/** Percentage 0..100 rounded to 2 decimals; 0 when the denominator is 0. */
export function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

/**
 * Rate definitions used by outsource.summary and exposed through CaseQueryService:
 *   total          = accepted + rejected + pending   (SUBMITTED is transient and never counted)
 *   remaining      = pending
 *   processingRate = (accepted + rejected) / total * 100
 *   acceptanceRate = accepted / (accepted + rejected) * 100   (share of PROCESSED cases)
 *   rejectionRate  = rejected / (accepted + rejected) * 100
 */
export function computeOutsourceSummary(c: {
  accepted: number;
  rejected: number;
  pending: number;
}): OutsourceSummaryDto {
  const processed = c.accepted + c.rejected;
  const total = processed + c.pending;
  return {
    total,
    accepted: c.accepted,
    rejected: c.rejected,
    pending: c.pending,
    remaining: c.pending,
    processingRate: percent(processed, total),
    acceptanceRate: percent(c.accepted, processed),
    rejectionRate: percent(c.rejected, processed),
  };
}
