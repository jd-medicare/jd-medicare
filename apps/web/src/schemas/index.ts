import { z } from 'zod';
export const CaseStatus = z.enum(['SUBMITTED', 'PENDING', 'ACCEPTED', 'REJECTED']);
export type CaseStatus = z.infer<typeof CaseStatus>;
const Person = z
  .object({ id: z.string().optional(), fullName: z.string().optional() })
  .nullish()
  .transform((p) => (p && p.id ? { id: p.id, fullName: p.fullName || 'User' } : null));

export const CustomerDto = z
  .object({
    id: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
    dateOfBirth: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    zipCode: z.string().optional(),
    extra: z.record(z.unknown()).nullish().default({}),
    organizationId: z.string().optional(),
    createdById: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .transform((c) => ({
    id: c.id || '',
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    dateOfBirth: c.dateOfBirth ?? null,
    address: c.address ?? null,
    zipCode: c.zipCode || '',
    extra: c.extra || {},
    organizationId: c.organizationId || '',
    createdById: c.createdById || '',
    createdAt: c.createdAt || '',
  }));
export type CustomerDto = z.infer<typeof CustomerDto>;

export const CaseDto = z
  .object({
    id: z.string(),
    status: CaseStatus,
    version: z.number().nullish().default(1),
    submittedAt: z.string().nullish().default(''),
    processedAt: z.string().nullable().optional(),
    processedBy: z.object({ id: z.string().optional(), fullName: z.string().optional() }).nullable().optional(),
    processedById: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    agent: z.object({ id: z.string().optional(), fullName: z.string().optional() }).optional(),
    agentId: z.string().optional(),
    teamLeader: z.object({ id: z.string().optional(), fullName: z.string().optional() }).nullable().optional(),
    teamLeaderId: z.string().nullable().optional(),
    customer: CustomerDto.nullish().transform((c) => c || {
      id: '',
      firstName: 'Customer',
      lastName: '',
      phone: '—',
      dateOfBirth: null,
      address: null,
      zipCode: '',
      extra: {},
      organizationId: '',
      createdById: '',
      createdAt: '',
    }),
    callRecord: z.object({ durationSeconds: z.number().nullable().optional() }).nullish(),
    callLengthSeconds: z.number().nullable().optional(),
    callLengthDisplay: z.string().nullable().optional(),
  })
  .transform((row) => {
    const dur = row.callLengthSeconds ?? row.callRecord?.durationSeconds ?? null;
    const durDisp =
      row.callLengthDisplay ?? (dur != null ? `${Math.floor(dur / 60)}m ${dur % 60}s` : null);
    const agentObj =
      row.agent?.id
        ? { id: row.agent.id, fullName: row.agent.fullName || 'Agent' }
        : { id: row.agentId || '', fullName: 'Agent' };
    const tlObj =
      row.teamLeader && row.teamLeader.id
        ? { id: row.teamLeader.id, fullName: row.teamLeader.fullName || 'Team Leader' }
        : row.teamLeaderId
        ? { id: row.teamLeaderId, fullName: 'Team Leader' }
        : null;
    const procObj =
      row.processedBy && row.processedBy.id
        ? { id: row.processedBy.id, fullName: row.processedBy.fullName || 'Reviewer' }
        : row.processedById
        ? { id: row.processedById, fullName: 'Reviewer' }
        : null;
    return {
      id: row.id,
      status: row.status,
      version: row.version ?? 1,
      submittedAt: row.submittedAt || '',
      processedAt: row.processedAt ?? null,
      processedBy: procObj,
      rejectionReason: row.rejectionReason ?? null,
      agent: agentObj,
      teamLeader: tlObj,
      customer: row.customer,
      callLengthSeconds: dur,
      callLengthDisplay: durDisp,
    };
  });
export type CaseDto = z.infer<typeof CaseDto>;
export const SessionUserDto = z.object({
  id: z.string(), email: z.string(), fullName: z.string(), organizationId: z.string(), roleKey: z.string(),
  permissions: z.array(z.string()), menus: z.array(z.string()), mfaEnabled: z.boolean(),
  isPrimarySuperAdmin: z.boolean().optional(),
});
export type SessionUserDto = z.infer<typeof SessionUserDto>;
export const LoginResult = z.object({ user: SessionUserDto.nullable(), mfaRequired: z.boolean() });
export const OutsourceSummary = z
  .object({
    total: z.number().optional(),
    totalProcessed: z.number().optional(),
    accepted: z.number().optional(),
    acceptedCount: z.number().optional(),
    rejected: z.number().optional(),
    rejectedCount: z.number().optional(),
    pending: z.number().optional(),
    remaining: z.number().optional(),
    processingRate: z.number().optional(),
    acceptanceRate: z.number().optional(),
    rejectionRate: z.number().optional(),
  })
  .transform((s) => {
    const tot = s.total ?? s.totalProcessed ?? 0;
    const acc = s.accepted ?? s.acceptedCount ?? 0;
    const rej = s.rejected ?? s.rejectedCount ?? 0;
    const rem = s.remaining ?? s.pending ?? 0;
    const rate = s.processingRate ?? (tot > 0 ? Math.round(((acc + rej) / tot) * 100) : 0);
    return {
      total: tot,
      accepted: acc,
      rejected: rej,
      pending: rem,
      remaining: rem,
      processingRate: rate,
      acceptanceRate: s.acceptanceRate ?? (tot > 0 ? Math.round((acc / tot) * 100) : 0),
      rejectionRate: s.rejectionRate ?? (tot > 0 ? Math.round((rej / tot) * 100) : 0),
    };
  });
export type OutsourceSummary = z.infer<typeof OutsourceSummary>;
export const Meta = z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() });
