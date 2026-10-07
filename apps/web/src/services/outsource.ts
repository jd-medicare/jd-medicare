import { z } from 'zod';
import { api } from './api-client';
import { CaseDto, OutsourceSummary, type CaseStatus } from '../schemas';
import { getUnifiedCases, setCaseStatus } from './caseSync';

export interface OutsourceQuery {
  page: number;
  pageSize: number;
  sort?: string;
  phone?: string;
  status?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const outsourceService = {
  cases: async (q: OutsourceQuery) => {
    const all = await getUnifiedCases();

    // Outsource sees SUBMITTED, PENDING, or whatever status is queried
    let filtered = all;
    if (q.status) {
      filtered = filtered.filter((c) => c.status === q.status);
    } else {
      // By default show all active records to process (SUBMITTED and PENDING) or all
      filtered = filtered.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED');
    }

    if (q.phone) {
      const p = q.phone.toLowerCase().replace(/\D/g, '');
      filtered = filtered.filter((c) => c.customer?.phone?.replace(/\D/g, '').includes(p));
    }

    // Sort
    if (q.sort?.includes('callLengthSeconds')) {
      const asc = q.sort.endsWith('asc');
      filtered.sort((a, b) => {
        const durA = a.callLengthSeconds ?? 0;
        const durB = b.callLengthSeconds ?? 0;
        return asc ? durA - durB : durB - durA;
      });
    } else if (q.sort === 'submittedAt:asc') {
      filtered.sort((a, b) => (a.submittedAt || '').localeCompare(b.submittedAt || ''));
    } else {
      filtered.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    }

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

  summary: async () => {
    // Try server first
    const s = await api.call('outsource.summary', { schema: OutsourceSummary }).catch(() => null);
    if (s?.data && s.data.total > 0) return s;

    // Dynamically calculate from unified cases
    const all = await getUnifiedCases();
    const total = all.length;
    const accepted = all.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = all.filter((c) => c.status === 'REJECTED').length;
    const remaining = all.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED').length;
    const processed = accepted + rejected;

    return {
      data: {
        total,
        remaining,
        accepted,
        rejected,
        processingRate: total > 0 ? Math.round((processed / total) * 100) : 0,
        acceptanceRate: processed > 0 ? Math.round((accepted / processed) * 100) : 0,
        rejectionRate: processed > 0 ? Math.round((rejected / processed) * 100) : 0,
      },
    };
  },

  accept: async (id: string, customerId?: string): Promise<{ data: { id: string; status: CaseStatus } }> => {
    // Live update status
    setCaseStatus(id, 'ACCEPTED', customerId);
    await api.call('cases.accept', { params: { id }, body: { confirm: 'CONFIRM' }, schema: z.any() }).catch(() => {});
    return { data: { id, status: 'ACCEPTED' } };
  },

  reject: async (id: string, reason?: string, customerId?: string): Promise<{ data: { id: string; status: CaseStatus } }> => {
    // Live update status
    setCaseStatus(id, 'REJECTED', customerId);
    await api.call('cases.reject', { params: { id }, body: { confirm: 'CONFIRM', reason: reason || 'Rejected' }, schema: z.any() }).catch(() => {});
    return { data: { id, status: 'REJECTED' } };
  },
};
