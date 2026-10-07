import { api } from './api-client';
import type { ListQuery } from './types';
import { AdminReport, CeoDashboard, ExportDto, OutsourceReport, TeamLeaderReport } from '../schemas/domain';
import { getUnifiedCases } from './caseSync';

function toDateKey(d?: string | number | null): string {
  if (!d) return '';
  const s = String(d).trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  return s.substring(0, 10);
}

export const reportService = {
  outsource: async (q: ListQuery) => {
    const res = await api.call('reports.outsource', { query: q, schema: OutsourceReport }).catch(() => null);
    if (res?.data?.summary && res.data.summary.total > 0) return res;

    // Build from unified cases
    const all = await getUnifiedCases();
    let cases = all;
    const fromKey = toDateKey(q.dateFrom);
    const toKey = toDateKey(q.dateTo);
    if (fromKey) cases = cases.filter((c) => toDateKey(c.submittedAt) >= fromKey);
    if (toKey) cases = cases.filter((c) => toDateKey(c.submittedAt) <= toKey);

    const total = cases.length;
    const accepted = cases.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = cases.filter((c) => c.status === 'REJECTED').length;
    const pending = cases.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED').length;
    const processed = accepted + rejected;

    // Group by agent
    const agentMap: Record<string, { agentId: string; agentName: string; total: number; accepted: number; rejected: number; pending: number }> = {};
    for (const c of cases) {
      const aId = c.agent?.id || 'agent';
      const aName = c.agent?.fullName || 'Intake Agent';
      if (!agentMap[aId]) {
        agentMap[aId] = { agentId: aId, agentName: aName, total: 0, accepted: 0, rejected: 0, pending: 0 };
      }
      agentMap[aId].total += 1;
      if (c.status === 'ACCEPTED') agentMap[aId].accepted += 1;
      else if (c.status === 'REJECTED') agentMap[aId].rejected += 1;
      else agentMap[aId].pending += 1;
    }

    // Group by date
    const dateMap: Record<string, { date: string; total: number; accepted: number; rejected: number; pending: number }> = {};
    for (const c of cases) {
      const d = (c.submittedAt || '').substring(0, 10) || new Date().toISOString().substring(0, 10);
      if (!dateMap[d]) {
        dateMap[d] = { date: d, total: 0, accepted: 0, rejected: 0, pending: 0 };
      }
      dateMap[d].total += 1;
      if (c.status === 'ACCEPTED') dateMap[d].accepted += 1;
      else if (c.status === 'REJECTED') dateMap[d].rejected += 1;
      else dateMap[d].pending += 1;
    }

    return {
      data: {
        summary: {
          total,
          remaining: pending,
          accepted,
          rejected,
          pending,
          processingRate: total > 0 ? Math.round((processed / total) * 100) : 0,
          acceptanceRate: processed > 0 ? Math.round((accepted / processed) * 100) : 0,
          rejectionRate: processed > 0 ? Math.round((rejected / processed) * 100) : 0,
          byAgent: Object.values(agentMap),
          byDate: Object.values(dateMap),
        },
      },
    };
  },

  teamLeader: async (q: ListQuery) => {
    const res = await api.call('reports.teamLeader', { query: q, schema: TeamLeaderReport }).catch(() => null);
    if (res?.data?.summary && res.data.summary.totalRecords > 0) return res;

    // Fallback: build dynamically from all unified cases so team leader sees real agent data
    const all = await getUnifiedCases();
    let cases = all;
    if (q.dateFrom) cases = cases.filter((c) => (c.submittedAt || '').substring(0, 10) >= q.dateFrom!);
    if (q.dateTo) cases = cases.filter((c) => (c.submittedAt || '').substring(0, 10) <= q.dateTo!);
    if (q.user) {
      const u = String(q.user).toLowerCase();
      cases = cases.filter((c) => c.agent?.fullName?.toLowerCase().includes(u) || c.agent?.id === String(q.user));
    }

    const totalRecords = cases.length;
    const accepted = cases.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = cases.filter((c) => c.status === 'REJECTED').length;
    const pending = cases.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED').length;
    const reviewedRecords = accepted + rejected;
    const modifiedRecords = 0;

    let totalSeconds = 0;
    let minSeconds = cases.length > 0 ? Infinity : 0;
    let maxSeconds = 0;
    for (const c of cases) {
      const dur = c.callLengthSeconds || 0;
      totalSeconds += dur;
      if (dur < minSeconds) minSeconds = dur;
      if (dur > maxSeconds) maxSeconds = dur;
    }
    if (minSeconds === Infinity) minSeconds = 0;
    const averageSeconds = totalRecords > 0 ? Math.round(totalSeconds / totalRecords) : 0;

    // Group by agent
    const agentMap: Record<string, { agentId: string; agentName: string; total: number; totalSeconds: number }> = {};
    for (const c of cases) {
      const aId = c.agent?.id || 'agent';
      const aName = c.agent?.fullName || 'Intake Agent';
      if (!agentMap[aId]) {
        agentMap[aId] = { agentId: aId, agentName: aName, total: 0, totalSeconds: 0 };
      }
      agentMap[aId].total += 1;
      agentMap[aId].totalSeconds += (c.callLengthSeconds || 0);
    }

    const byAgent = Object.values(agentMap).map((a) => ({
      agentId: a.agentId,
      agentName: a.agentName,
      total: a.total,
      averageCallSeconds: a.total > 0 ? Math.round(a.totalSeconds / a.total) : 0,
    }));

    return {
      data: {
        summary: {
          totalRecords,
          reviewedRecords,
          modifiedRecords,
          accepted,
          rejected,
          pending,
          callLength: {
            totalSeconds,
            averageSeconds,
            minSeconds,
            maxSeconds,
          },
          byAgent,
        },
        rows: [],
      },
    };
  },
  admin: (q: ListQuery) => api.call('reports.admin', { query: q, schema: AdminReport }),
  ceoDashboard: async (q: ListQuery) => {
    const res = await api.call('ceo.dashboard', { query: q, schema: CeoDashboard }).catch(() => null);

    // Compute real operations and records by date from unified cases
    const allCases = await getUnifiedCases();
    let cases = allCases;
    const fromKey = toDateKey(q.dateFrom);
    const toKey = toDateKey(q.dateTo);
    if (fromKey) cases = cases.filter((c) => toDateKey(c.submittedAt) >= fromKey);
    if (toKey) cases = cases.filter((c) => toDateKey(c.submittedAt) <= toKey);

    const totalRecords = cases.length;
    const accepted = cases.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = cases.filter((c) => c.status === 'REJECTED').length;
    const pending = cases.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED').length;
    const newRecords = totalRecords;
    const processed = accepted + rejected;
    const processingRate = totalRecords > 0 ? Math.round((processed / totalRecords) * 100) : 0;
    const acceptanceRate = processed > 0 ? Math.round((accepted / processed) * 100) : 0;
    const rejectionRate = processed > 0 ? Math.round((rejected / processed) * 100) : 0;

    // Call length metrics
    const durations = cases.map((c) => c.callLengthSeconds || 0).filter((s) => s > 0);
    const totalSeconds = durations.reduce((a, b) => a + b, 0);
    const averageSeconds = durations.length > 0 ? Math.round(totalSeconds / durations.length) : 0;
    const minSeconds = durations.length > 0 ? Math.min(...durations) : 0;
    const maxSeconds = durations.length > 0 ? Math.max(...durations) : 0;

    // Records by date
    const dateMap: Record<string, { date: string; total: number; accepted: number; rejected: number; pending: number }> = {};
    for (const c of cases) {
      const d = (c.submittedAt || '').substring(0, 10) || new Date().toISOString().substring(0, 10);
      if (!dateMap[d]) {
        dateMap[d] = { date: d, total: 0, accepted: 0, rejected: 0, pending: 0 };
      }
      dateMap[d].total += 1;
      if (c.status === 'ACCEPTED') dateMap[d].accepted += 1;
      else if (c.status === 'REJECTED') dateMap[d].rejected += 1;
      else dateMap[d].pending += 1;
    }
    const recordsByDate = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));

    if (res?.data) {
      return {
        data: {
          ...res.data,
          operations: {
            totalRecords: totalRecords > 0 ? totalRecords : res.data.operations.totalRecords,
            newRecords: totalRecords > 0 ? newRecords : res.data.operations.newRecords,
            pending: totalRecords > 0 ? pending : res.data.operations.pending,
            accepted: totalRecords > 0 ? accepted : res.data.operations.accepted,
            rejected: totalRecords > 0 ? rejected : res.data.operations.rejected,
            processingRate: totalRecords > 0 ? processingRate : res.data.operations.processingRate,
            acceptanceRate: totalRecords > 0 ? acceptanceRate : res.data.operations.acceptanceRate,
            rejectionRate: totalRecords > 0 ? rejectionRate : res.data.operations.rejectionRate,
          },
          callLength: {
            totalSeconds: totalSeconds || res.data.callLength.totalSeconds,
            averageSeconds: averageSeconds || res.data.callLength.averageSeconds,
            minSeconds: minSeconds || res.data.callLength.minSeconds,
            maxSeconds: maxSeconds || res.data.callLength.maxSeconds,
          },
          trends: {
            ...res.data.trends,
            recordsByDate: recordsByDate.length > 0 ? recordsByDate : res.data.trends.recordsByDate,
          },
        },
      };
    }

    // Fallback if backend API call fails completely
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
    const todayStr = now.toISOString().substring(0, 10);

    return {
      data: {
        range: {
          dateFrom: q.dateFrom || firstDay,
          dateTo: q.dateTo || todayStr,
        },
        operations: {
          totalRecords,
          newRecords,
          pending,
          accepted,
          rejected,
          processingRate,
          acceptanceRate,
          rejectionRate,
        },
        people: {
          activeAgents: 1,
          activeTeamLeaders: 1,
          activeOutsourceUsers: 1,
        },
        callLength: {
          totalSeconds,
          averageSeconds,
          minSeconds,
          maxSeconds,
        },
        finance: {
          totalIncome: '0',
          totalExpenses: '0',
          netPosition: '0',
          currency: 'PKR',
        },
        trends: {
          incomeVsExpenseByMonth: [],
          recordsByDate,
        },
      },
    };
  },
  createExport: (b: { reportType: string; format: string; filters: Record<string, unknown> }) =>
    api.call('reports.exportCreate', { body: b, schema: ExportDto }),
  exportStatus: (id: string) => api.call('reports.exportGet', { params: { id }, schema: ExportDto }),
};
