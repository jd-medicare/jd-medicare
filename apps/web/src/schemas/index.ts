import { z } from 'zod';
export const CaseStatus = z.enum(['SUBMITTED', 'PENDING', 'ACCEPTED', 'REJECTED']);
export type CaseStatus = z.infer<typeof CaseStatus>;
const Person = z.object({ id: z.string(), fullName: z.string() });
export const CustomerDto = z.object({
  id: z.string(), firstName: z.string(), lastName: z.string(), phone: z.string(),
  dateOfBirth: z.string().nullable(), address: z.string().nullable(), zipCode: z.string(),
  extra: z.record(z.unknown()), createdAt: z.string(),
});
export const CaseDto = z.object({
  id: z.string(), status: CaseStatus, version: z.number(), submittedAt: z.string(),
  processedAt: z.string().nullable(), processedBy: Person.nullable(), rejectionReason: z.string().nullable(),
  agent: Person, teamLeader: Person.nullable(), customer: CustomerDto,
  callLengthSeconds: z.number().nullable(), callLengthDisplay: z.string().nullable(),
});
export type CaseDto = z.infer<typeof CaseDto>;
export const SessionUserDto = z.object({
  id: z.string(), email: z.string(), fullName: z.string(), organizationId: z.string(), roleKey: z.string(),
  permissions: z.array(z.string()), menus: z.array(z.string()), mfaEnabled: z.boolean(),
  isPrimarySuperAdmin: z.boolean().optional(),
});
export type SessionUserDto = z.infer<typeof SessionUserDto>;
export const LoginResult = z.object({ user: SessionUserDto.nullable(), mfaRequired: z.boolean() });
export const OutsourceSummary = z.object({
  total: z.number(), accepted: z.number(), rejected: z.number(), pending: z.number(), remaining: z.number(),
  processingRate: z.number(), acceptanceRate: z.number(), rejectionRate: z.number(),
});
export const Meta = z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() });
