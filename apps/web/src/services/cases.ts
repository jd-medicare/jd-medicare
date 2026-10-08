import { z } from 'zod';
import { api } from './api-client';
import { supabase } from './supabase';
import type { ListQuery } from './types';
import { CaseDto, CustomerDto, type CaseStatus } from '../schemas';
import { CustomerCreateResult } from '../schemas/domain';
import {
  getCaseStatus,
  getUnifiedCases,
  saveLocallyRegisteredCustomer,
  setCaseStatus,
  setLocalCallLength,
} from './caseSync';

export interface CustomerForm {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  age?: string | number;
  address: string;
  zipCode: string;
  state?: string;
  ssnMbi?: string;
  extra?: Record<string, unknown>;
}

export interface CustomerWithCaseStatus extends CustomerDto {
  caseStatus: CaseStatus;
}

export const caseService = {
  // customers.create creates the customer and case via backend API
  createCustomer: async (b: CustomerForm) => {
    const res = await api.call('customers.create', { body: b, schema: CustomerCreateResult });
    const customer = res.data.customer;

    if (customer?.id) {
      setCaseStatus(customer.id, 'PENDING');
    }

    return res;
  },

  // Returns all unified cases across the system
  list: async (q: ListQuery) => {
    const all = await getUnifiedCases();

    // Apply filtering
    let filtered = all;
    if (q.phone) {
      const p = String(q.phone).toLowerCase().replace(/\D/g, '');
      filtered = filtered.filter((c) => c.customer?.phone?.replace(/\D/g, '').includes(p));
    }
    if (q.status) {
      filtered = filtered.filter((c) => c.status === q.status);
    }
    if (q.dateFrom) {
      filtered = filtered.filter((c) => (c.submittedAt || '').substring(0, 10) >= q.dateFrom!);
    }
    if (q.dateTo) {
      filtered = filtered.filter((c) => (c.submittedAt || '').substring(0, 10) <= q.dateTo!);
    }

    // Sort
    if (q.sort === 'submittedAt:asc') {
      filtered.sort((a, b) => (a.submittedAt || '').localeCompare(b.submittedAt || ''));
    } else {
      filtered.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    }

    // Pagination
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.max(1, Number(q.pageSize) || 25);
    const offset = (page - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    return {
      data: paginated,
      meta: {
        page,
        limit: pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize) || 1,
      },
    };
  },

  get: async (id: string) => {
    const all = await getUnifiedCases();
    const found = all.find((c) => c.id === id || c.customer?.id === id);
    if (found) return { data: found };
    return api.call('cases.get', { params: { id }, schema: CaseDto });
  },

  updateDetails: async (
    id: string,
    form: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      dateOfBirth?: string | null;
      age?: string | number | null;
      state?: string;
      address?: string;
      zipCode?: string;
      ssnMbi?: string;
      agentId?: string;
      teamLeaderId?: string | null;
      durationSeconds?: number | null;
    }
  ) => {
    // 1. If call length is provided, persist locally
    if (form.durationSeconds !== undefined && form.durationSeconds !== null) {
      setLocalCallLength(id, form.durationSeconds);
    }

    // 2. Call backend cases.update or fallback to customers.update
    let res: any = null;
    try {
      res = await api.call('cases.update', {
        params: { id },
        body: form,
        schema: z.any(),
      });
    } catch {
      try {
        res = await api.call('customers.update', {
          params: { id },
          body: form,
          schema: z.any(),
        });
      } catch (e) {
        throw e;
      }
    }

    // 3. Update unified memory/local storage cache
    try {
      const all = await getUnifiedCases();
      const match = all.find((c) => c.id === id || c.customer?.id === id);
      if (match && match.customer) {
        const updatedCust = {
          ...match.customer,
          firstName: form.firstName ?? match.customer.firstName,
          lastName: form.lastName ?? match.customer.lastName,
          phone: form.phone ?? match.customer.phone,
          dateOfBirth: form.dateOfBirth !== undefined ? form.dateOfBirth : match.customer.dateOfBirth,
          address: form.state ?? form.address ?? match.customer.address,
          zipCode: form.zipCode ?? match.customer.zipCode,
          extra: {
            ...((match.customer.extra as any) || {}),
            ssnMbi: form.ssnMbi !== undefined ? form.ssnMbi : (match.customer.extra as any)?.ssnMbi,
            state: form.state ?? (match.customer.extra as any)?.state,
            age: form.age !== undefined ? form.age : (match.customer.extra as any)?.age,
          },
        };
        saveLocallyRegisteredCustomer(updatedCust as any);
      }
    } catch {}

    return res;
  },

  setCallLength: async (id: string, durationSeconds: number) => {
    // 1. Immediately store in local state under given id
    setLocalCallLength(id, durationSeconds);

    // 2. Map between caseId and customerId if known
    try {
      const all = await getUnifiedCases();
      const match = all.find((c) => c.id === id || c.customer?.id === id);
      if (match) {
        if (match.id) setLocalCallLength(match.id, durationSeconds);
        if (match.customer?.id) setLocalCallLength(match.customer.id, durationSeconds);

        // 3. If real case exists in Supabase, update call_records directly
        const { data: session } = await supabase.auth.getSession();
        const user = session?.session?.user;
        if (user && match.id) {
          const { data: caseRow } = await supabase
            .from('cases')
            .select('id, organizationId')
            .eq('id', match.id)
            .maybeSingle();

          if (caseRow) {
            try {
              await supabase
                .from('call_records')
                .upsert(
                  {
                    organizationId: caseRow.organizationId,
                    caseId: caseRow.id,
                    durationSeconds,
                    setById: user.id,
                  },
                  { onConflict: 'caseId' }
                );
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('setCallLength pre-sync note:', e);
    }

    // 4. Try backend API, catching any foreign key error safely
    try {
      const res = await api
        .call('cases.setCallLength', {
          params: { id },
          body: { durationSeconds },
          schema: z.any(),
        })
        .catch((err) => {
          console.warn('api.call cases.setCallLength handled gracefully:', err);
          return null;
        });

      return res ?? { data: { id, durationSeconds } };
    } catch {
      return { data: { id, durationSeconds } };
    }
  },

  // Search existing customers by phone digits AND return their case status
  findCustomerByPhone: async (phone: string): Promise<CustomerWithCaseStatus[]> => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return [];

    const results: CustomerWithCaseStatus[] = [];

    try {
      // 1. Direct Supabase query
      const { data } = await supabase
        .from('customers')
        .select('id, firstName, lastName, phone, dateOfBirth, address, zipCode, extra, createdAt')
        .ilike('phone', `%${digits}%`)
        .limit(5);

      if (data && data.length > 0) {
        for (const row of data) {
          const parsed = CustomerDto.parse(row);
          results.push({
            ...parsed,
            caseStatus: getCaseStatus(parsed.id),
          });
        }
      }
    } catch (e) {
      console.warn('findCustomerByPhone db note:', e);
    }

    // 2. Check unified cases
    try {
      const allCases = await getUnifiedCases();
      for (const c of allCases) {
        if (c.customer?.phone?.replace(/\D/g, '').includes(digits)) {
          if (!results.some((r) => r.id === c.customer.id || r.phone === c.customer.phone)) {
            results.push({
              ...c.customer,
              caseStatus: c.status,
            });
          }
        }
      }
    } catch (e) {
      console.warn('findCustomerByPhone unified note:', e);
    }

    return results;
  },
};
