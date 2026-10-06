import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CEO_RANGES } from '@shared/enums';
import { reportService } from '../../services/reports';
import { errorMessage } from '../../services/api-client';
import { Kpis, Loading, pageStyle } from '../../design-system';
import { fmtSeconds } from '../../lib/format';

const RANGE_LABEL: Record<string, string> = { TODAY: 'Today', THIS_WEEK: 'This week', THIS_MONTH: 'This month', PREVIOUS_MONTH: 'Previous month', YEAR_TO_DATE: 'Year to date', CUSTOM: 'Custom range' };

export default function CeoDashboardPage() {
  const [range, setRange] = useState('THIS_MONTH'); const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  const custom = range === 'CUSTOM'; const customReady = !custom || (!!dateFrom && !!dateTo);
  const q = useQuery({
    queryKey: ['ceo', range, custom ? dateFrom : '', custom ? dateTo : ''], enabled: customReady,
    queryFn: () => reportService.ceoDashboard({ range, dateFrom: custom ? dateFrom : undefined, dateTo: custom ? dateTo : undefined }),
  });
  const d = q.data?.data;
  return (
    <main style={pageStyle}>
      <h1 style={{ margin: 0 }}>CEO dashboard</h1>
      <form style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }} onSubmit={(e) => e.preventDefault()} aria-label="Date range">
        <label style={{ margin: 0 }}>Range<select className="input" value={range} onChange={(e) => setRange(e.target.value)}>{CEO_RANGES.map((r) => <option key={r} value={r}>{RANGE_LABEL[r]}</option>)}</select></label>
        {custom && <><label style={{ margin: 0 }}>From<input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label style={{ margin: 0 }}>To<input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label></>}
      </form>
      {!customReady && <p>Choose both dates to load the custom range.</p>}
      {q.isLoading && customReady && <Loading />}
      {q.isError && <p className="err" role="alert">{errorMessage(q.error)}</p>}
      {d && (<>
        <p style={{ margin: 0, color: 'var(--secondary)' }}>Showing {d.range.dateFrom} to {d.range.dateTo}</p>
        <h2 style={{ margin: 0, fontSize: 18 }}>Operations</h2>
        <Kpis label="Operations" items={[['Total records', d.operations.totalRecords], ['New records', d.operations.newRecords], ['Pending', d.operations.pending], ['Accepted', d.operations.accepted],
          ['Rejected', d.operations.rejected], ['Processed', `${d.operations.processingRate}%`], ['Acceptance', `${d.operations.acceptanceRate}%`], ['Rejection', `${d.operations.rejectionRate}%`]]} />
        <h2 style={{ margin: 0, fontSize: 18 }}>People and calls</h2>
        <Kpis label="People and calls" items={[['Active agents', d.people.activeAgents], ['Active team leaders', d.people.activeTeamLeaders], ['Active outsource users', d.people.activeOutsourceUsers],
          ['Average call', fmtSeconds(d.callLength.averageSeconds)], ['Shortest call', fmtSeconds(d.callLength.minSeconds)], ['Longest call', fmtSeconds(d.callLength.maxSeconds)], ['Total call time', fmtSeconds(d.callLength.totalSeconds)]]} />
        <h2 style={{ margin: 0, fontSize: 18 }}>Finance</h2>
        {d.finance ? <Kpis label="Finance" items={[['Income', `${d.finance.totalIncome} ${d.finance.currency}`], ['Expenses', `${d.finance.totalExpenses} ${d.finance.currency}`], ['Net position', `${d.finance.netPosition} ${d.finance.currency}`]]} />
          : <p className="card" role="note">Finance figures are not available for your account.</p>}
        <h2 style={{ margin: 0, fontSize: 18 }}>Records by date</h2>
        <Trend caption="Records by date" head={['Date', 'Total', 'Accepted', 'Rejected', 'Pending']} rows={d.trends.recordsByDate.map((r) => [r.date, r.total, r.accepted, r.rejected, r.pending])} />
        {d.finance && <><h2 style={{ margin: 0, fontSize: 18 }}>Income vs expenses by month</h2>
          <Trend caption="Income versus expenses by month" head={['Month', 'Income', 'Expenses']} rows={d.trends.incomeVsExpenseByMonth.map((r) => [r.month, r.income, r.expenses])} /></>}
      </>)}
    </main>
  );
}

function Trend({ caption, head, rows }: { caption: string; head: string[]; rows: Array<Array<string | number>> }) {
  return (<div className="table-wrap"><table><caption className="sr-only" style={{ position: 'absolute', left: -9999 }}>{caption}</caption>
    <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.length === 0 ? <tr><td colSpan={head.length}>No data in this range.</td></tr> : rows.map((r) => <tr key={String(r[0])}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>);
}
