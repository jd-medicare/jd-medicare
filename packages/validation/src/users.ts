import { z } from 'zod';
import { MENUS, PERMISSIONS, ROLE_KEYS, USER_STATUSES } from '@app/shared-types';
import { emailSchema, passwordSchema } from './auth';
import { listQuerySchema } from './common';

const phone = z.string().trim().min(5).max(30);
const fullName = z.string().trim().min(1).max(120);

export const createUserSchema = z
  .object({ email: emailSchema, fullName, phone: phone.optional(), roleKey: z.enum(ROLE_KEYS), password: passwordSchema.optional() })
  .strict();
export const updateUserSchema = z.object({ fullName: fullName.optional(), phone: phone.optional() }).strict();
export const setRoleSchema = z.object({ roleKey: z.enum(ROLE_KEYS) }).strict();
export const setPermissionsSchema = z.object({ permissions: z.array(z.enum(PERMISSIONS as unknown as [string, ...string[]])).max(200) }).strict();
export const setMenusSchema = z.object({ menus: z.array(z.enum(MENUS)).max(50) }).strict();
export const reasonBodySchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();
export const usersListQuerySchema = listQuerySchema.extend({
  status: z.enum(USER_STATUSES).optional(),
  role: z.enum(ROLE_KEYS).optional(),
});
export const auditListQuerySchema = listQuerySchema.extend({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
