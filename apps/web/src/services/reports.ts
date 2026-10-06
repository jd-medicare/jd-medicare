import { api } from './api-client';
import type { ListQuery } from './types';
import { AdminReport, CeoDashboard, ExportDto, OutsourceReport, TeamLeaderReport } from '../schemas/domain';

export const reportService = {
  outsource: (q: ListQuery) => api.call('reports.outsource', { query: q, schema: OutsourceReport }),
  teamLeader: (q: ListQuery) => api.call('reports.teamLeader', { query: q, schema: TeamLeaderReport }),
  admin: (q: ListQuery) => api.call('reports.admin', { query: q, schema: AdminReport }),
  ceoDashboard: (q: ListQuery) => api.call('ceo.dashboard', { query: q, schema: CeoDashboard }),
  createExport: (b: { reportType: string; format: string; filters: Record<string, unknown> }) => api.call('reports.exportCreate', { body: b, schema: ExportDto }),
  exportStatus: (id: string) => api.call('reports.exportGet', { params: { id }, schema: ExportDto }),
};
