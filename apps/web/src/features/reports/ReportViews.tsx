import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reports';
import { errorMessage } from '../../services/api-client';
import { Kpis, Loading, StatusBadge } from '../../design-system';
import { fmtSeconds } from '../../lib/format';
import type { ListQuery } from '../../services/types';
import { formatCallSeconds, getUnifiedCases } from '../../services/caseSync';
import type { CaseDto } from '../../schemas';

function Table({ caption, head, rows }: { caption: string; head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="table-wrap">
      <table>
        <caption style={{ textAlign: 'left', padding: 12, fontWeight: 600 }}>{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length}>No data for these filters.</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={String(r[0])}>
                {r.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function State({ q, children }: { q: { isLoading: boolean; isError: boolean; error: unknown }; children: ReactNode }) {
  if (q.isLoading) return <Loading />;
  if (q.isError) return <p className="err" role="alert">{errorMessage(q.error)}</p>;
  return <>{children}</>;
}

export function OutsourceView({ filters }: { filters: ListQuery & { user?: string } }) {
  const q = useQuery({
    queryKey: ['report', 'OUTSOURCE', filters],
    queryFn: () => reportService.outsource(filters),
    refetchInterval: 3000,
  });
  const rawSummary = q.data?.data.summary;

  // Filter summary by user if user filter was applied
  const s = rawSummary
    ? (() => {
        if (!filters.user) return rawSummary;
        const filterUserLower = String(filters.user).toLowerCase().trim();
        const matchingAgents = rawSummary.byAgent.filter(
          (a) => a.agentName.toLowerCase().includes(filterUserLower) || a.agentId.toLowerCase().includes(filterUserLower)
        );
        if (matchingAgents.length === 0) {
          return {
            ...rawSummary,
            total: 0,
            accepted: 0,
            rejected: 0,
            pending: 0,
            remaining: 0,
            processingRate: 0,
            acceptanceRate: 0,
            rejectionRate: 0,
            byAgent: [],
          };
        }
        const total = matchingAgents.reduce((sum, a) => sum + a.total, 0);
        const accepted = matchingAgents.reduce((sum, a) => sum + a.accepted, 0);
        const rejected = matchingAgents.reduce((sum, a) => sum + a.rejected, 0);
        const pending = matchingAgents.reduce((sum, a) => sum + a.pending, 0);
        const processed = accepted + rejected;
        return {
          ...rawSummary,
          total,
          accepted,
          rejected,
          pending,
          remaining: pending,
          processingRate: total > 0 ? Math.round((processed / total) * 100) : 0,
          acceptanceRate: processed > 0 ? Math.round((accepted / processed) * 100) : 0,
          rejectionRate: processed > 0 ? Math.round((rejected / processed) * 100) : 0,
          byAgent: matchingAgents,
        };
      })()
    : null;

  return (
    <State q={q}>
      {s && (
        <>
          <Kpis
            label="Outsource summary"
            items={[
              ['Total cases', s.total],
              ['Accepted cases', s.accepted],
              ['Rejected cases', s.rejected],
              ['Pending / Remaining', s.remaining],
              ['Processed', `${s.processingRate}%`],
              ['Acceptance rate', `${s.acceptanceRate}%`],
              ['Rejection rate', `${s.rejectionRate}%`],
            ]}
          />
          <Table
            caption="Outsource performance by agent / user"
            head={['Agent / User', 'Total', 'Accepted', 'Rejected', 'Pending']}
            rows={s.byAgent.map((a) => [a.agentName, a.total, a.accepted, a.rejected, a.pending])}
          />
          <Table
            caption="Outsource records by date"
            head={['Date', 'Total', 'Accepted', 'Rejected', 'Pending']}
            rows={s.byDate.map((a) => [a.date, a.total, a.accepted, a.rejected, a.pending])}
          />
        </>
      )}
    </State>
  );
}

/** The "team performance" table for team leaders is the byAgent block of this report. */
export function TeamLeaderView({ filters }: { filters: ListQuery }) {
  const q = useQuery({
    queryKey: ['report', 'TEAM_LEADER', filters],
    queryFn: () => reportService.teamLeader(filters),
    refetchInterval: 3000,
  });
  const s = q.data?.data.summary;
  return (
    <State q={q}>
      {s && (
        <>
          <Kpis
            label="Team summary"
            items={[
              ['Total records', s.totalRecords],
              ['Reviewed', s.reviewedRecords],
              ['Modified', s.modifiedRecords],
              ['Accepted', s.accepted],
              ['Rejected', s.rejected],
              ['Pending', s.pending],
              ['Average call', fmtSeconds(s.callLength.averageSeconds)],
            ]}
          />
          <Table
            caption="Team performance by agent"
            head={['Agent', 'Records', 'Average call length']}
            rows={s.byAgent.map((a) => [a.agentName, a.total, fmtSeconds(a.averageCallSeconds)])}
          />
        </>
      )}
    </State>
  );
}

export function AdminView({ filters }: { filters: ListQuery }) {
  const q = useQuery({
    queryKey: ['report', 'ADMIN', filters],
    queryFn: () => reportService.admin(filters),
    refetchInterval: 3000,
  });
  const s = q.data?.data.summary;
  return (
    <State q={q}>
      {s && (
        <>
          <Kpis
            label="Administration summary"
            items={[
              ['Users', s.totalUsers],
              ['Active', s.activeUsers],
              ['Locked', s.lockedUsers],
              ['Records', s.totalRecords],
              ['Accepted', s.accepted],
              ['Rejected', s.rejected],
              ['Pending', s.pending],
            ]}
          />
          <Table
            caption="Users by role"
            head={['Role', 'Users']}
            rows={s.usersByRole.map((r) => [r.roleKey, r.count])}
          />
        </>
      )}
    </State>
  );
}

export function CeoCasesView({ filters }: { filters: ListQuery & { user?: string; status?: string } }) {
  const q = useQuery({
    queryKey: ['report', 'CEO_CASES'],
    queryFn: () => getUnifiedCases(),
    refetchInterval: 3000,
  });

  const allCases = q.data ?? [];

  // Helper to normalize any date string (DD/MM/YYYY or YYYY-MM-DD) to YYYY-MM-DD for accurate comparison
  function toDateKey(d?: string | number | null): string {
    if (!d) return '';
    const s = String(d).trim();
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    // YYYY-MM-DD
    const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
    return s.substring(0, 10);
  }

  // Filter cases according to user criteria
  let cases = allCases;
  const fromKey = toDateKey(filters.dateFrom);
  const toKey = toDateKey(filters.dateTo);

  if (fromKey) {
    cases = cases.filter((c) => toDateKey(c.submittedAt) >= fromKey);
  }
  if (toKey) {
    cases = cases.filter((c) => toDateKey(c.submittedAt) <= toKey);
  }
  if (filters.user) {
    const filterUserLower = String(filters.user).toLowerCase().trim();
    cases = cases.filter(
      (c) =>
        (c.agent?.fullName || '').toLowerCase().includes(filterUserLower) ||
        (c.agent?.id || '').toLowerCase() === filterUserLower
    );
  }
  if (filters.status) {
    const s = String(filters.status).toUpperCase();
    if (s === 'PENDING' || s === 'SUBMITTED') {
      cases = cases.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED');
    } else {
      cases = cases.filter((c) => c.status === s);
    }
  }

  // Deduplicate cases by customer phone/id so each customer is shown only once and always with zipCode
  const uniqueCases: typeof cases = [];
  const seenCust = new Set<string>();
  for (const c of cases) {
    const p = (c.customer?.phone || '').replace(/\D/g, '');
    const cId = c.customerId || c.customer?.id || c.id;
    const key = p ? `p_${p}` : `c_${cId}`;
    if (seenCust.has(key)) {
      const idx = uniqueCases.findIndex((uc) => {
        const ucp = (uc.customer?.phone || '').replace(/\D/g, '');
        const uccId = uc.customerId || uc.customer?.id || uc.id;
        return (p && ucp && p === ucp) || (cId && uccId && cId === uccId);
      });
      if (idx >= 0 && !uniqueCases[idx].customer?.zipCode && c.customer?.zipCode) {
        uniqueCases[idx] = {
          ...uniqueCases[idx],
          customer: {
            ...uniqueCases[idx].customer,
            ...c.customer,
            zipCode: c.customer.zipCode,
          },
        };
      }
      continue;
    }
    seenCust.add(key);
    uniqueCases.push(c);
  }
  cases = uniqueCases;

  // Summary counts
  const total = cases.length;
  const pending = cases.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED').length;
  const accepted = cases.filter((c) => c.status === 'ACCEPTED').length;
  const rejected = cases.filter((c) => c.status === 'REJECTED').length;
  const processed = accepted + rejected;
  const acceptanceRate = processed > 0 ? Math.round((accepted / processed) * 100) : 0;
  const rejectionRate = processed > 0 ? Math.round((rejected / processed) * 100) : 0;
  const processingRate = total > 0 ? Math.round((processed / total) * 100) : 0;

  // Breakdown by Agent / User
  const agentMap: Record<
    string,
    { agentId: string; agentName: string; total: number; accepted: number; rejected: number; pending: number }
  > = {};
  for (const c of cases) {
    const aId = c.agent?.id || c.agent?.fullName || 'intake-agent';
    const aName = c.agent?.fullName || 'Intake Agent';
    if (!agentMap[aId]) {
      agentMap[aId] = { agentId: aId, agentName: aName, total: 0, accepted: 0, rejected: 0, pending: 0 };
    }
    agentMap[aId].total += 1;
    if (c.status === 'ACCEPTED') agentMap[aId].accepted += 1;
    else if (c.status === 'REJECTED') agentMap[aId].rejected += 1;
    else agentMap[aId].pending += 1;
  }
  const byAgent = Object.values(agentMap).sort((a, b) => b.total - a.total);

  // Breakdown by Date
  const dateMap: Record<
    string,
    { date: string; total: number; accepted: number; rejected: number; pending: number }
  > = {};
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
  const byDate = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));

  // CSV Export Handler
  function handleDownloadCsv() {
    const headers = ['Customer', 'Phone', 'Zip Code', 'Agent / User', 'Submitted Date', 'Call Length', 'Status'];
    const rows = cases.map((c) => [
      `"${c.customer ? `${c.customer.firstName || ''} ${c.customer.lastName || ''}`.trim() : '—'}"`,
      `"${c.customer?.phone || '—'}"`,
      `"${c.customer?.zipCode || '—'}"`,
      `"${c.agent?.fullName || 'Intake Agent'}"`,
      `"${c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '—'}"`,
      `"${c.callLengthDisplay || (c.callLengthSeconds ? formatCallSeconds(c.callLengthSeconds) : '—')}"`,
      `"${c.status || 'PENDING'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cases-report-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <State q={q}>
      <div style={{ display: 'grid', gap: 20 }}>
        {/* Top Summary Bar with Download CSV Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: 'var(--muted, #94a3b8)', fontWeight: 500 }}>
              Showing {cases.length} of {allCases.length} total system cases
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 36,
              padding: '0 16px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV Report
          </button>
        </div>

        {/* Highlighted Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total cases
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: 'var(--text)' }}>
              {total}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid rgba(245, 158, 11, 0.3)',
              background: 'rgba(245, 158, 11, 0.04)',
            }}
          >
            <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending cases
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#d97706' }}>
              {pending}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid rgba(34, 197, 94, 0.3)',
              background: 'rgba(34, 197, 94, 0.04)',
            }}
          >
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>
              Accepted cases
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#16a34a' }}>
              {accepted}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.04)',
            }}
          >
            <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase' }}>
              Rejected cases
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#ef4444' }}>
              {rejected}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>
              Processed
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#0d9488' }}>
              {processingRate}%
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>
              Acceptance rate
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#16a34a' }}>
              {acceptanceRate}%
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>
              Rejection rate
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#ef4444' }}>
              {rejectionRate}%
            </div>
          </div>
        </div>

        {/* Table 1: Breakdown by Agent / User */}
        <Table
          caption="Cases breakdown by agent / user"
          head={['Agent / User', 'Total Cases', 'Pending', 'Accepted', 'Rejected', 'Acceptance %']}
          rows={byAgent.map((a) => {
            const proc = a.accepted + a.rejected;
            const rate = proc > 0 ? `${Math.round((a.accepted / proc) * 100)}%` : '0%';
            return [a.agentName, a.total, a.pending, a.accepted, a.rejected, rate];
          })}
        />

        {/* Table 2: Breakdown by Date */}
        <Table
          caption="Cases breakdown by date"
          head={['Date', 'Total Cases', 'Pending', 'Accepted', 'Rejected']}
          rows={byDate.map((d) => [d.date, d.total, d.pending, d.accepted, d.rejected])}
        />

        {/* Table 3: Detailed Case Records matching filters */}
        <div className="card" style={{ padding: '18px 22px', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Matching case records ({cases.length})
            </h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">CUSTOMER</th>
                  <th scope="col">PHONE</th>
                  <th scope="col">ZIP CODE</th>
                  <th scope="col">AGENT / USER</th>
                  <th scope="col">SUBMITTED</th>
                  <th scope="col">CALL LENGTH</th>
                  <th scope="col">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)', padding: '24px 12px' }}>
                      No cases match the selected filters.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const custName =
                      c.customer
                        ? `${c.customer.firstName || ''} ${c.customer.lastName || ''}`.trim()
                        : 'Customer';
                    const submitted = c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '—';
                    const callLen =
                      c.callLengthDisplay ||
                      (c.callLengthSeconds ? formatCallSeconds(c.callLengthSeconds) : '—');

                    return (
                      <tr key={c.id}>
                        <td>
                          <Link to={'/cases/' + c.id} style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {custName}
                          </Link>
                        </td>
                        <td>{c.customer?.phone || '—'}</td>
                        <td>{c.customer?.zipCode || '—'}</td>
                        <td>{c.agent?.fullName || 'Intake Agent'}</td>
                        <td style={{ fontSize: 13, color: 'var(--muted, #94a3b8)' }}>{submitted}</td>
                        <td style={{ fontSize: 13 }}>{callLen}</td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </State>
  );
}

