import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reports';
import { errorMessage } from '../../services/api-client';
import { Kpis, Loading } from '../../design-system';
import { fmtSeconds } from '../../lib/format';
import type { ListQuery } from '../../services/types';

function Table({ caption, head, rows }: { caption: string; head: string[]; rows: Array<Array<string | number>> }) {
  return (<div className="table-wrap"><table><caption style={{ textAlign: 'left', padding: 12, fontWeight: 600 }}>{caption}</caption>
    <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.length === 0 ? <tr><td colSpan={head.length}>No data for these dates.</td></tr> : rows.map((r) => <tr key={String(r[0])}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>);
}
function State({ q, children }: { q: { isLoading: boolean; isError: boolean; error: unknown }; children: ReactNode }) {
  if (q.isLoading) return <Loading />;
  if (q.isError) return <p className="err" role="alert">{errorMessage(q.error)}</p>;
  return <>{children}</>;
}

export function OutsourceView({ filters }: { filters: ListQuery }) {
  const q = useQuery({ queryKey: ['report', 'OUTSOURCE', filters], queryFn: () => reportService.outsource(filters) }); const s = q.data?.data.summary;
  return (<State q={q}>{s && <>
    <Kpis label="Outsource summary" items={[['Total', s.total], ['Remaining', s.remaining], ['Accepted', s.accepted], ['Rejected', s.rejected], ['Processed', `${s.processingRate}%`], ['Acceptance', `${s.acceptanceRate}%`], ['Rejection', `${s.rejectionRate}%`]]} />
    <Table caption="By agent" head={['Agent', 'Total', 'Accepted', 'Rejected', 'Pending']} rows={s.byAgent.map((a) => [a.agentName, a.total, a.accepted, a.rejected, a.pending])} />
    <Table caption="By date" head={['Date', 'Total', 'Accepted', 'Rejected', 'Pending']} rows={s.byDate.map((a) => [a.date, a.total, a.accepted, a.rejected, a.pending])} /></>}</State>);
}
/** The "team performance" table for team leaders is the byAgent block of this report. */
export function TeamLeaderView({ filters }: { filters: ListQuery }) {
  const q = useQuery({ queryKey: ['report', 'TEAM_LEADER', filters], queryFn: () => reportService.teamLeader(filters) }); const s = q.data?.data.summary;
  return (<State q={q}>{s && <>
    <Kpis label="Team summary" items={[['Total records', s.totalRecords], ['Reviewed', s.reviewedRecords], ['Modified', s.modifiedRecords], ['Accepted', s.accepted], ['Rejected', s.rejected], ['Pending', s.pending], ['Average call', fmtSeconds(s.callLength.averageSeconds)]]} />
    <Table caption="Team performance by agent" head={['Agent', 'Records', 'Average call length']} rows={s.byAgent.map((a) => [a.agentName, a.total, fmtSeconds(a.averageCallSeconds)])} /></>}</State>);
}
export function AdminView({ filters }: { filters: ListQuery }) {
  const q = useQuery({ queryKey: ['report', 'ADMIN', filters], queryFn: () => reportService.admin(filters) }); const s = q.data?.data.summary;
  return (<State q={q}>{s && <>
    <Kpis label="Administration summary" items={[['Users', s.totalUsers], ['Active', s.activeUsers], ['Locked', s.lockedUsers], ['Records', s.totalRecords], ['Accepted', s.accepted], ['Rejected', s.rejected], ['Pending', s.pending]]} />
    <Table caption="Users by role" head={['Role', 'Users']} rows={s.usersByRole.map((r) => [r.roleKey, r.count])} /></>}</State>);
}
