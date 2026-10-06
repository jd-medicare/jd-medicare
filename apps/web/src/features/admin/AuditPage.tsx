import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AUDIT_EVENTS } from '@shared/enums';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { Pager, StateRows, pageStyle } from '../../design-system';
import { useDebounced } from '../../lib/hooks';
import { fmtDateTime } from '../../lib/format';

export default function AuditPage() {
  const [page, setPage] = useState(1); const [event, setEvent] = useState(''); const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState(''); const dEntity = useDebounced(entityType);
  const list = useQuery({ queryKey: ['audit', page, event, dEntity, dateFrom, dateTo], queryFn: () => adminService.audit({ page, pageSize: 25, event, entityType: dEntity, dateFrom, dateTo }) });
  const rows = list.data?.data ?? []; const reset = (fn: () => void) => { fn(); setPage(1); };
  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}><h1 style={{ margin: 0, flex: 1 }}>Audit log</h1><Link to="/admin/users">Users</Link></div>
      <form role="search" aria-label="Filter audit log" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }} onSubmit={(e) => e.preventDefault()}>
        <label style={{ margin: 0 }}>Event<select className="input" value={event} onChange={(e) => reset(() => setEvent(e.target.value))}>
          <option value="">All events</option>{AUDIT_EVENTS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label style={{ margin: 0 }}>Entity type<input className="input" value={entityType} onChange={(e) => reset(() => setEntityType(e.target.value))} /></label>
        <label style={{ margin: 0 }}>From<input className="input" type="date" value={dateFrom} onChange={(e) => reset(() => setDateFrom(e.target.value))} /></label>
        <label style={{ margin: 0 }}>To<input className="input" type="date" value={dateTo} onChange={(e) => reset(() => setDateTo(e.target.value))} /></label>
      </form>
      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}
      <div className="table-wrap"><table>
        <thead><tr><th scope="col">When</th><th scope="col">Event</th><th scope="col">Actor</th><th scope="col">Entity</th><th scope="col">Request</th><th scope="col">Changes</th></tr></thead>
        <tbody>
          <StateRows loading={list.isLoading} empty={!list.isError && rows.length === 0} cols={6} message="No audit entries match these filters." />
          {rows.map((a) => (
            <tr key={a.id}><td>{fmtDateTime(a.at)}</td><td>{a.event}</td><td>{a.actor?.fullName ?? 'System'}</td><td>{a.entityType} {a.entityId}</td><td>{a.requestId}</td>
              <td>{(a.before || a.after) ? <details><summary>View</summary><pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxWidth: 360 }}>{JSON.stringify({ before: a.before, after: a.after }, null, 2)}</pre></details> : '—'}</td></tr>))}
        </tbody></table></div>
      <Pager meta={list.data?.meta} page={page} onPage={setPage} />
    </main>
  );
}
