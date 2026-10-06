import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { outsourceService } from '../../services/outsource';
import { errorMessage } from '../../services/api-client';
import { Dialog, StatusBadge } from '../../design-system';
import type { CaseDto, SessionUserDto } from '../../schemas';

function useDebounced<T>(v: T, ms = 350) { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]); return d; }

export default function OutsourcePage({ user }: { user: SessionUserDto }) {
  const [page, setPage] = useState(1); const [phone, setPhone] = useState(''); const [status, setStatus] = useState('');
  const [sort, setSort] = useState('submittedAt:desc'); const dPhone = useDebounced(phone);
  const [target, setTarget] = useState<{ c: CaseDto; kind: 'accept' | 'reject' } | null>(null);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['outsource', page, dPhone, status, sort], queryFn: () => outsourceService.cases({ page, pageSize: 25, phone: dPhone, status, sort }) });
  const summary = useQuery({ queryKey: ['outsource-summary'], queryFn: () => outsourceService.summary() });
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.permissions.includes('*'));
  const canProcess = isSuper || user.permissions.includes('case:accept');
  const toggleSort = (f: string) => setSort(sort === `${f}:asc` ? `${f}:desc` : `${f}:asc`);
  const rows = list.data?.data ?? []; const meta = list.data?.meta; const s = summary.data?.data;
  const cols = canProcess ? 6 : 5;
  const kpis: Array<[string, string | number]> = s ? [['Total', s.total], ['Remaining', s.remaining], ['Accepted', s.accepted], ['Rejected', s.rejected], ['Processed', `${s.processingRate}%`]] : [];
  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: 0 }}>Records to process</h1>
      <section className="kpis" aria-label="Summary">
        {s ? kpis.map(([l, v]) => (<div className="card" key={l}><div style={{ color: 'var(--secondary)' }}>{l}</div><div style={{ fontSize: 26, fontWeight: 700 }}>{v}</div></div>))
          : Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton" style={{ height: 76 }} />)}
      </section>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Search by phone" aria-label="Search by phone" value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} />
        <select className="input" style={{ maxWidth: 180 }} aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="PENDING">Pending</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option>
        </select>
      </div>
      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th scope="col">Customer</th><th scope="col">Phone</th><th scope="col">Agent</th>
            <th scope="col" aria-sort={sort.startsWith('callLengthSeconds') ? (sort.endsWith('asc') ? 'ascending' : 'descending') : 'none'}><button className="btn" onClick={() => toggleSort('callLengthSeconds')}>Call length</button></th>
            <th scope="col">Status</th>{canProcess && <th scope="col">Action</th>}
          </tr></thead>
          <tbody>
            {list.isLoading && Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={cols}><div className="skeleton" style={{ height: 20 }} /></td></tr>)}
            {!list.isLoading && rows.length === 0 && <tr><td colSpan={cols}>No records match these filters. Clear the search or choose another status.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.customer.firstName} {c.customer.lastName}</td><td>{c.customer.phone}</td><td>{c.agent.fullName}</td>
                <td>{c.callLengthDisplay ?? '—'}</td><td><StatusBadge status={c.status} /></td>
                {canProcess && <td>{c.status === 'PENDING' && <span style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => setTarget({ c, kind: 'accept' })}>Accept</button>
                  <button className="btn" onClick={() => setTarget({ c, kind: 'reject' })}>Reject</button></span>}</td>}
              </tr>))}
          </tbody>
        </table>
      </div>
      {meta && <nav aria-label="Pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {meta.page} of {meta.totalPages} ({meta.total} records)</span>
        <button className="btn" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button></nav>}
      <ProcessDialog target={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); qc.invalidateQueries({ queryKey: ['outsource'] }); qc.invalidateQueries({ queryKey: ['outsource-summary'] }); }} />
    </main>
  );
}

function ProcessDialog({ target, onClose, onDone }: { target: { c: CaseDto; kind: 'accept' | 'reject' } | null; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(''); const [reason, setReason] = useState('');
  useEffect(() => { setText(''); setReason(''); }, [target]);
  const m = useMutation({
    mutationFn: () => target!.kind === 'accept' ? outsourceService.accept(target!.c.id) : outsourceService.reject(target!.c.id, reason.trim()),
    onSuccess: onDone,
  });
  const reject = target?.kind === 'reject';
  const ready = text === 'CONFIRM' && (!reject || reason.trim().length > 0);
  return (
    <Dialog open={!!target} title={reject ? 'Reject this record' : 'Accept this record'} onClose={onClose}>
      {target && <p>{target.c.customer.firstName} {target.c.customer.lastName}, {target.c.customer.phone}. Changing a processed record later needs a recorded reason.</p>}
      {reject && <label>Reason for rejection<textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
      <label>Type CONFIRM to continue<input className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" /></label>
      {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={`btn ${reject ? 'btn-danger' : 'btn-primary'}`} disabled={!ready || m.isPending} onClick={() => m.mutate()}>{reject ? 'Reject record' : 'Accept record'}</button>
      </div>
    </Dialog>
  );
}
