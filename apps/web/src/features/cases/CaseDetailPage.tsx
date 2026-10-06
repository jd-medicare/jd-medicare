import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caseService } from '../../services/cases';
import { errorMessage } from '../../services/api-client';
import { Loading, StatusBadge, TextField, pageStyle } from '../../design-system';
import { fmtDateTime, parseDuration } from '../../lib/format';
import type { SessionUserDto } from '../../schemas';

export default function CaseDetailPage({ user }: { user: SessionUserDto }) {
  const id = useParams().id ?? '';
  const q = useQuery({ queryKey: ['case', id], queryFn: () => caseService.get(id), enabled: !!id });
  const c = q.data?.data;
  const canSet = user.permissions.includes('call_length:create') || user.permissions.includes('call_length:update');
  return (
    <main style={pageStyle}>
      <p style={{ margin: 0 }}><Link to="/cases">Back to cases</Link></p>
      {q.isLoading && <Loading />}
      {q.isError && <p className="err" role="alert">{errorMessage(q.error)}</p>}
      {c && (<>
        <h1 style={{ margin: 0 }}>{c.customer.firstName} {c.customer.lastName} <StatusBadge status={c.status} /></h1>
        <section className="card" aria-label="Case details"><dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 24px', margin: 0 }}>
          {([['Phone', c.customer.phone], ['Date of birth', c.customer.dateOfBirth ?? '—'], ['Address', c.customer.address ?? '—'], ['Zip code', c.customer.zipCode],
            ['Agent', c.agent.fullName], ['Team leader', c.teamLeader?.fullName ?? '—'], ['Submitted', fmtDateTime(c.submittedAt)],
            ['Processed', fmtDateTime(c.processedAt)], ['Processed by', c.processedBy?.fullName ?? '—'], ['Rejection reason', c.rejectionReason ?? '—'],
            ['Call length', c.callLengthDisplay ?? 'Not set']] as Array<[string, string]>).map(([k, v]) => (<div key={k} style={{ display: 'contents' }}><dt style={{ color: 'var(--secondary)' }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>))}
        </dl></section>
        {canSet && <CallLengthForm caseId={c.id} current={c.callLengthDisplay} />}
      </>)}
    </main>
  );
}

function CallLengthForm({ caseId, current }: { caseId: string; current: string | null }) {
  const [v, setV] = useState(current ?? ''); const [err, setErr] = useState(''); const qc = useQueryClient();
  useEffect(() => setV(current ?? ''), [current]);
  const m = useMutation({
    mutationFn: (s: number) => caseService.setCallLength(caseId, s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', caseId] }); qc.invalidateQueries({ queryKey: ['cases'] }); },
  });
  function submit(e: FormEvent) {
    e.preventDefault(); m.reset();
    const s = parseDuration(v);
    if (s === null) { setErr('Use hh:mm:ss, for example 00:05:42. Minutes and seconds are 00 to 59.'); return; }
    setErr(''); m.mutate(s);
  }
  return (
    <form className="card" onSubmit={submit} noValidate style={{ maxWidth: 360 }} aria-label="Set call length">
      <h2 style={{ margin: 0, fontSize: 18 }}>Call length</h2>
      <TextField label="Call length (hh:mm:ss)" placeholder="00:05:42" inputMode="numeric" autoComplete="off" value={v} onChange={setV} error={err} />
      {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
      {m.isSuccess && <p role="status">Call length saved.</p>}
      <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={m.isPending}>Save call length</button>
    </form>
  );
}
