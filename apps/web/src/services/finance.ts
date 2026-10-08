import { z } from 'zod';
import { api } from './api-client';
import type { ListQuery } from './types';
import { ExpenseDto, ExpenseHeadDto, IncomeDto, IncomeHeadDto } from '../schemas/domain';

export type Kind = 'income' | 'expense';
/** One row shape for both lists so the page does not branch per kind. */
export interface TxRow {
  id: string;
  date: string;
  category: string;
  fromDate?: string | null;
  toDate?: string | null;
  incomeHeadId?: string | null;
  party: string | null;
  reference: string | null;
  description?: string | null;
  amount: string;
  currency: string;
  status: 'ACTIVE' | 'VOIDED';
}
export interface TxForm {
  amount: string;
  date: string;
  fromDate?: string;
  toDate?: string;
  category?: string;
  incomeHeadId?: string;
  expenseHeadId?: string;
  payee?: string;
  reference?: string;
  description?: string;
}
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));

export const financeService = {
  async list(kind: Kind, q: ListQuery) {
    if (kind === 'income') {
      const r = await api.call('finance.incomeList', { query: q, schema: z.array(IncomeDto) });
      return {
        meta: r.meta,
        rows: r.data.map((i): TxRow => ({
          id: i.id,
          date: i.date,
          category: i.category,
          fromDate: i.fromDate,
          toDate: i.toDate,
          incomeHeadId: i.incomeHeadId,
          party: null,
          reference: i.reference,
          description: i.description,
          amount: i.amount,
          currency: i.currency,
          status: i.status,
        })),
      };
    }
    const r = await api.call('finance.expenseList', { query: q, schema: z.array(ExpenseDto) });
    return {
      meta: r.meta,
      rows: r.data.map((e): TxRow => ({
        id: e.id,
        date: e.date,
        category: e.expenseHeadName,
        party: e.payee,
        reference: e.reference,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        status: e.status,
      })),
    };
  },
  create: (kind: Kind, f: TxForm) => kind === 'income'
    ? api.call('finance.incomeCreate', {
        body: clean({
          amount: f.amount,
          date: f.date || f.fromDate,
          fromDate: f.fromDate,
          toDate: f.toDate,
          incomeHeadId: f.incomeHeadId,
          category: f.category,
          reference: f.reference,
          description: f.description,
        }),
        schema: IncomeDto,
      })
    : api.call('finance.expenseCreate', {
        body: clean({
          amount: f.amount,
          date: f.date,
          expenseHeadId: f.expenseHeadId,
          payee: f.payee,
          reference: f.reference,
          description: f.description,
        }),
        schema: ExpenseDto,
      }),
  void: (kind: Kind, id: string, reason: string) => kind === 'income'
    ? api.call('finance.incomeVoid', { params: { id }, body: { reason }, schema: IncomeDto })
    : api.call('finance.expenseVoid', { params: { id }, body: { reason }, schema: ExpenseDto }),
  heads: () => api.call('finance.expenseHeadList', { schema: z.array(ExpenseHeadDto) }),
  createHead: (name: string) => api.call('finance.expenseHeadCreate', { body: { name: name.trim() }, schema: z.union([ExpenseHeadDto, z.any()]) }),
  incomeHeads: () => api.call('finance.incomeHeadList', { schema: z.array(IncomeHeadDto) }),
  createIncomeHead: (name: string) => api.call('finance.incomeHeadCreate', { body: { name: name.trim() }, schema: z.union([IncomeHeadDto, z.any()]) }),
};
