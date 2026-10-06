import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const idParamSchema = z.object({ id: uuidSchema });

const intFromQuery = (def: number, min: number, max: number) =>
  z.preprocess((v) => (v === undefined || v === '' ? def : Number(v)), z.number().int().min(min).max(max));

/** Shared list query: page, pageSize (default 25, max 100), sort "field:asc|desc", search. */
export const listQuerySchema = z.object({
  page: intFromQuery(1, 1, 1_000_000),
  pageSize: intFromQuery(25, 1, 100),
  sort: z.string().regex(/^[A-Za-z]+:(asc|desc)$/).optional(),
  search: z.string().trim().max(100).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
