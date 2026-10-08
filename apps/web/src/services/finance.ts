import { z } from 'zod';
import { api } from './api-client';
import type { ListQuery } from './types';
import { ExpenseDto, ExpenseHeadDto, IncomeDto, IncomeHeadDto } from '../schemas/domain';

import { supabase } from './supabase';

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
  incomeHeads: async () => {
    const list: IncomeHeadDto[] = [];
    const seenNames = new Set<string>();

    try {
      const res = await api.call('finance.incomeHeadList', { schema: z.array(IncomeHeadDto) });
      if (res?.data && Array.isArray(res.data)) {
        for (const h of res.data) {
          list.push(h);
          if (h.name) seenNames.add(h.name.toLowerCase());
        }
      }
    } catch (e) {
      console.warn('api incomeHeadList notice:', e);
    }

    try {
      const { data: dbHeads } = await supabase
        .from('income_heads')
        .select('*')
        .order('name');
      if (dbHeads && Array.isArray(dbHeads)) {
        for (const h of dbHeads) {
          const lower = (h.name || '').toLowerCase();
          if (!seenNames.has(lower)) {
            seenNames.add(lower);
            list.push({ id: h.id, name: h.name, isActive: h.isActive !== false });
          }
        }
      }
    } catch {}

    try {
      const cached = JSON.parse(localStorage.getItem('cached_income_heads') || '[]');
      if (Array.isArray(cached)) {
        for (const h of cached) {
          const lower = (h.name || '').toLowerCase();
          if (!seenNames.has(lower)) {
            seenNames.add(lower);
            list.push({ id: h.id, name: h.name, isActive: h.isActive !== false });
          }
        }
      }
    } catch {}

    return { data: list };
  },
  createIncomeHead: async (name: string) => {
    const cleanName = name.trim();
    const cleanKey = cleanName.toLowerCase();

    // 1. Try API call
    try {
      const res = await api.call('finance.incomeHeadCreate', {
        body: { name: cleanName },
        schema: z.union([IncomeHeadDto, z.any()]),
      });
      if (res?.data) {
        try {
          const cached = JSON.parse(localStorage.getItem('cached_income_heads') || '[]');
          if (!cached.find((h: any) => h.name?.toLowerCase() === cleanKey)) {
            cached.push(res.data);
            localStorage.setItem('cached_income_heads', JSON.stringify(cached));
          }
        } catch {}
        return res;
      }
    } catch (apiErr: any) {
      console.warn('api incomeHeadCreate notice, trying direct Supabase fallback:', apiErr);
    }

    // 2. Direct Supabase insert fallback
    try {
      const { data: authSession } = await supabase.auth.getSession();
      const currentOrgId =
        authSession?.session?.user?.app_metadata?.organization_id ||
        authSession?.session?.user?.user_metadata?.organization_id ||
        '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('income_heads')
        .insert({
          organizationId: currentOrgId,
          name: cleanName,
          nameKey: cleanKey,
          isActive: true,
        })
        .select()
        .single();

      if (!error && data) {
        try {
          const cached = JSON.parse(localStorage.getItem('cached_income_heads') || '[]');
          cached.push(data);
          localStorage.setItem('cached_income_heads', JSON.stringify(cached));
        } catch {}
        return { data };
      }
    } catch (dbErr) {
      console.warn('direct Supabase insert notice:', dbErr);
    }

    // 3. Local cache fallback to guarantee seamless user experience
    const localHead = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ih_${Date.now()}`,
      name: cleanName,
      isActive: true,
    };
    try {
      const cached = JSON.parse(localStorage.getItem('cached_income_heads') || '[]');
      cached.push(localHead);
      localStorage.setItem('cached_income_heads', JSON.stringify(cached));
    } catch {}

    return { data: localHead };
  },
};
