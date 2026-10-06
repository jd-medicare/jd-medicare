import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { caseService } from '../../services/cases';
import { errorMessage } from '../../services/api-client';
import { Pager, StateRows, StatusBadge, pageStyle } from '../../design-system';
import { useDebounced } from '../../lib/hooks';
import { fmtDateTime } from '../../lib/format';
import type { SessionUserDto } from '../../schemas';

export default function CasesPage({ user }: { user: SessionUserDto }) {
  const [page, setPage] = useState(1); const [phone, setPhone] = useState(''); const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState(''); const [sort, setSort] = useState('submittedAt:desc');
  const dPhone = useDebounced(phone);
  const list = useQuery({ queryKey: ['cases', page, dPhone, status, dateFrom, dateTo, sort], queryFn: () => caseService.list({ page, pageSize: 25, phone: dPhone, status, dateFrom, dateTo, sort }) });
  const rows = list.data?.data ?? []; const own = user.roleKey === 'AGENT'; const reset = (fn: () => void) => { fn(); setPage(1); };
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.permissions.includes('*'));
  const showCall = isSuper || user.permissions.includes('call_length:view');
  const cols = 5 + (own ? 0 : 1) + (showCall ? 1 : 0);
  return (
    <main style={pageStyle}>
      <h1 style={{ margin: 0 }}>{own ? 'My cases' : 'Cases'}</h1>
      <form role="search" aria-label="Filter cases" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }} onSubmit={(e) => e.preventDefault()}>
        <label style={{ margin: 0 }}>Phone<input className="input" value={phone} onChange={(e) => reset(() => setPhone(e.target.value))} /></label>
        <label style={{ margin: 0 }}>Status<select className="input" value={status} onChange={(e) => reset(() => setStatus(e.target.value))}>
          <option value="">All statuses</option><option value="PENDING">Pending</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option></select></label>
        <label style={{ margin: 0 }}>Submitted from<input className="input" type="date" value={dateFrom} onChange={(e) => reset(() => setDateFrom(e.target.value))} /></label>
        <label style={{ margin: 0 }}>Submitted to<input className="input" type="date" value={dateTo} onChange={(e) => reset(() => setDateTo(e.target.value))} /></label>
        <label style={{ margin: 0 }}>Sort<select className="input" value={sort} onChange={(e) => reset(() => setSort(e.target.value))}>
          <option value="submittedAt:desc">Newest first</option><option value="submittedAt:asc">Oldest first</option></select></label>
      </form>
      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Customer</th><th scope="col">Phone</th>{!own && <th scope="col">Agent</th>}<th scope="col">Submitted</th>{showCall && <th scope="col">Call length</th>}<th scope="col">Status</th></tr></thead>
          <tbody>
            <StateRows loading={list.isLoading} empty={!list.isError && rows.length === 0} cols={cols} message="No cases match these filters. Clear a filter or add a customer." />
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/cases/${c.id}`}>{c.customer.firstName} {c.customer.lastName}</Link></td><td>{c.customer.phone}</td>
                {!own && <td>{c.agent.fullName}</td>}<td>{fmtDateTime(c.submittedAt)}</td>
                {showCall && <td>{c.callLengthDisplay ?? '—'}</td>}<td><StatusBadge status={c.status} /></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <Pager meta={list.data?.meta} page={page} onPage={setPage} />
    </main>
  );
}
