// Account 2 - zod schemas for customers / cases / call length / decisions / list queries.
// Pure zod (v3). Error messages never echo submitted values (they can be personal data).
import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isRealIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const isoDate = z
  .string()
  .refine(isRealIsoDate, { message: 'must be a real date in YYYY-MM-DD format' });

/** Strip spaces, dashes, dots, parentheses; keep optional leading "+". Result: +?[0-9]{6,15}. */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s\-.()]/g, '');
}

export const phoneSchema = z
  .string()
  .max(32)
  .transform(normalizePhone)
  .refine((v) => /^\+?[0-9]{6,15}$/.test(v), {
    message: 'must be a valid phone number (6-15 digits, optional leading +)',
  });

const name = (label: string) => z.string().trim().min(1, `${label} is required`).max(100);

const dateOfBirth = isoDate.refine((s) => s <= new Date().toISOString().slice(0, 10), {
  message: 'must not be in the future',
}).refine((s) => s >= '1900-01-01', { message: 'must be on or after 1900-01-01' });

const extraSchema = z
  .record(z.unknown())
  .refine((o) => Object.keys(o).length <= 50, { message: 'at most 50 keys' })
  .refine((o) => JSON.stringify(o).length <= 10_000, { message: 'must be under 10 KB' });

const customerFields = {
  firstName: name('firstName'),
  lastName: name('lastName'),
  phone: phoneSchema,
  dateOfBirth,
  address: z.string().trim().min(1, 'address is required').max(500),
  zipCode: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 \-]{1,10}[A-Za-z0-9]$/, 'invalid zipCode'),
  extra: extraSchema,
};

const reason = z.string().trim().min(1).max(1000);

export const customerCreateSchema = z
  .object({ ...customerFields, extra: customerFields.extra.optional() })
  .strict();

/** Partial customer fields; at least one key required. */
export const customerPatchSchema = z
  .object({
    firstName: customerFields.firstName.optional(),
    lastName: customerFields.lastName.optional(),
    phone: customerFields.phone.optional(),
    dateOfBirth: customerFields.dateOfBirth.optional(),
    address: customerFields.address.optional(),
    zipCode: customerFields.zipCode.optional(),
    extra: customerFields.extra.optional(),
  })
  .strict()
  .refine((o) => Object.values(o).some((v) => v !== undefined), {
    message: 'at least one customer field is required',
  });

export const customerUpdateBodySchema = z
  .object({
    firstName: customerFields.firstName.optional(),
    lastName: customerFields.lastName.optional(),
    phone: customerFields.phone.optional(),
    dateOfBirth: customerFields.dateOfBirth.optional(),
    address: customerFields.address.optional(),
    zipCode: customerFields.zipCode.optional(),
    extra: customerFields.extra.optional(),
    reason: reason.optional(),
  })
  .strict()
  .refine((o) => Object.entries(o).some(([k, v]) => k !== 'reason' && v !== undefined), {
    message: 'at least one customer field is required',
  });

const expectedVersion = z.number().int().min(1);

export const caseUpdateSchema = z
  .object({ customer: customerPatchSchema, expectedVersion, reason: reason.optional() })
  .strict();

export const callLengthSchema = z
  .object({ durationSeconds: z.number().int().min(0).max(86_400) })
  .strict();

/** `confirm` is checked separately by the service so a missing/wrong value yields CONFIRMATION_REQUIRED. */
export const acceptBodySchema = z.object({ confirm: z.literal('CONFIRM') }).strict();
export const rejectBodySchema = z.object({ confirm: z.literal('CONFIRM'), reason }).strict();
export const modifyProcessedSchema = z
  .object({
    confirm: z.literal('CONFIRM'),
    reason,
    customer: customerPatchSchema.optional(),
    expectedVersion,
  })
  .strict()
  .refine((o) => o.customer !== undefined, { message: 'customer changes are required' });

// ---- list queries ----------------------------------------------------------
const intParam = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const uuid = z.string().uuid();
const sortParam = z.string().regex(/^[A-Za-z]+:(asc|desc)$/, 'sort must be "field:asc|desc"');

export const caseListQuerySchema = z.object({
  page: intParam(1, 1_000_000).default(1),
  pageSize: intParam(1, 100).default(25),
  sort: sortParam.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['SUBMITTED', 'PENDING', 'ACCEPTED', 'REJECTED']).optional(),
  agentId: uuid.optional(),
  teamLeaderId: uuid.optional(),
  outsourceUserId: uuid.optional(),
  phone: z.string().trim().min(1).max(32).transform(normalizePhone).refine((v) => /^\+?[0-9]{1,15}$/.test(v), { message: 'phone filter must contain digits only (optional leading +)' }).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  submittedFrom: isoDate.optional(),
  submittedTo: isoDate.optional(),
  processedFrom: isoDate.optional(),
  processedTo: isoDate.optional(),
  minCallSeconds: intParam(0, 86_400).optional(),
  maxCallSeconds: intParam(0, 86_400).optional(),
});
export type CaseListQuery = z.infer<typeof caseListQuerySchema>;

export const customerListQuerySchema = z.object({
  page: caseListQuerySchema.shape.page,
  pageSize: caseListQuerySchema.shape.pageSize,
  sort: sortParam.optional(),
  search: caseListQuerySchema.shape.search,
  phone: caseListQuerySchema.shape.phone,
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export const outsourceSummaryQuerySchema = z.object({
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  agentId: uuid.optional(),
});
export type OutsourceSummaryQuery = z.infer<typeof outsourceSummaryQuerySchema>;
