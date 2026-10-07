import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AUDIT_EVENTS } from '@shared/enums';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { Pager, StateRows, pageStyle } from '../../design-system';
import { fmtDateTime } from '../../lib/format';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [eventInput, setEventInput] = useState('');
  const [entityTypeInput, setEntityTypeInput] = useState('');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');

  const [applied, setApplied] = useState({ event: '', entityType: '', dateFrom: '', dateTo: '' });

  const list = useQuery({
    queryKey: ['audit', page, applied.event, applied.entityType, applied.dateFrom, applied.dateTo],
    queryFn: () =>
      adminService.audit({
        page,
        pageSize: 25,
        event: applied.event || undefined,
        entityType: applied.entityType || undefined,
        dateFrom: applied.dateFrom || undefined,
        dateTo: applied.dateTo || undefined,
      }),
  });

  const rows = list.data?.data ?? [];

  function handleSearch(e?: FormEvent) {
    if (e) e.preventDefault();
    setPage(1);
    setApplied({
      event: eventInput,
      entityType: entityTypeInput.trim(),
      dateFrom: dateFromInput,
      dateTo: dateToInput,
    });
  }

  function handleClear() {
    setEventInput('');
    setEntityTypeInput('');
    setDateFromInput('');
    setDateToInput('');
    setPage(1);
    setApplied({ event: '', entityType: '', dateFrom: '', dateTo: '' });
  }

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Audit log</h1>
        <Link to="/admin/users" className="btn" style={{ height: 38, display: 'inline-flex', alignItems: 'center' }}>
          ← Users
        </Link>
      </div>

      <form
        role="search"
        aria-label="Filter audit log"
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          padding: '16px 20px',
          background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
          borderRadius: 10,
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          marginTop: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160, flex: '1 1 160px' }}>
          <label htmlFor="audit-event" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Event
          </label>
          <select
            id="audit-event"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={eventInput}
            onChange={(e) => setEventInput(e.target.value)}
          >
            <option value="">All events</option>
            {AUDIT_EVENTS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160, flex: '1 1 160px' }}>
          <label htmlFor="audit-entity" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Entity type
          </label>
          <input
            id="audit-entity"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            placeholder="e.g. user, case"
            value={entityTypeInput}
            onChange={(e) => setEntityTypeInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, flex: '1 1 150px' }}>
          <label htmlFor="audit-from" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            From
          </label>
          <input
            id="audit-from"
            className="input"
            type="date"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={dateFromInput}
            onChange={(e) => setDateFromInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, flex: '1 1 150px' }}>
          <label htmlFor="audit-to" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            To
          </label>
          <input
            id="audit-to"
            className="input"
            type="date"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={dateToInput}
            onChange={(e) => setDateToInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, height: 40, alignItems: 'center' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ height: 40, padding: '0 20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
          >
            Search
          </button>
          <button
            type="button"
            className="btn"
            style={{ height: 40, padding: '0 16px', display: 'inline-flex', alignItems: 'center' }}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </form>

      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Event</th>
              <th scope="col">Actor</th>
              <th scope="col">Entity</th>
              <th scope="col">Request</th>
              <th scope="col">Changes</th>
            </tr>
          </thead>
          <tbody>
            <StateRows loading={list.isLoading} empty={!list.isError && rows.length === 0} cols={6} message="No audit entries match these filters." />
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{fmtDateTime(a.at || a.createdAt)}</td>
                <td><span style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{a.event}</span></td>
                <td>{a.actor?.fullName ?? (a.actor?.email ? a.actor.email : 'System')}</td>
                <td>
                  <span style={{ textTransform: 'capitalize' }}>{a.entityType}</span> {a.entityId ? <code style={{ fontSize: 12 }}>{String(a.entityId).slice(0, 8)}</code> : ''}
                </td>
                <td style={{ fontSize: 12, color: 'var(--muted, #94a3b8)' }}>{a.requestId || String(a.id).slice(0, 8)}</td>
                <td>
                  {a.metadata && Object.keys(a.metadata).length > 0 ? (
                    <details>
                      <summary style={{ cursor: 'pointer', color: 'var(--primary, #e11d48)' }}>View metadata</summary>
                      <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', maxWidth: 360, fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 4 }}>
                        {JSON.stringify(a.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : a.before || a.after ? (
                    <details>
                      <summary style={{ cursor: 'pointer', color: 'var(--primary, #e11d48)' }}>View changes</summary>
                      <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', maxWidth: 360, fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 4 }}>
                        {JSON.stringify({ before: a.before, after: a.after }, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager meta={list.data?.meta} page={page} onPage={setPage} />
    </main>
  );
}
