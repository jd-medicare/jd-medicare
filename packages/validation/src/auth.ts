import { z } from 'zod';

/** Password policy: 12-128 chars, at least 3 of 4 character classes. */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .refine(
    (p) => [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length >= 3,
    'Password must include at least three of: lowercase, uppercase, digit, symbol',
  );
export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
export const mfaVerifySchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits') }).strict();
export const passwordForgotSchema = z.object({ email: emailSchema }).strict();
export const passwordResetSchema = z.object({ token: z.string().min(20).max(200), newPassword: passwordSchema }).strict();
