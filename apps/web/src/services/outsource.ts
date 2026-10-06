import { z } from 'zod';
import { api } from './api-client';
import { CaseDto, OutsourceSummary } from '../schemas';
export interface OutsourceQuery { page: number; pageSize: number; sort?: string; phone?: string; status?: string; agentId?: string; dateFrom?: string; dateTo?: string }
export const outsourceService = {
  cases: (q: OutsourceQuery) => api.call('outsource.cases', { query: { ...q }, schema: z.array(CaseDto) }),
  summary: () => api.call('outsource.summary', { schema: OutsourceSummary }),
  accept: (id: string) => api.call('cases.accept', { params: { id }, body: { confirm: 'CONFIRM' }, schema: CaseDto }),
  reject: (id: string, reason: string) => api.call('cases.reject', { params: { id }, body: { confirm: 'CONFIRM', reason }, schema: CaseDto }),
};
