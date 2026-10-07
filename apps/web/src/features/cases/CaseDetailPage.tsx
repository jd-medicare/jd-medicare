import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caseService } from '../../services/cases';
import { errorMessage } from '../../services/api-client';
import { recordAudit } from '../../services/audit';
import { Loading, StatusBadge, TextField, pageStyle } from '../../design-system';
import { fmtDateTime, parseDuration } from '../../lib/format';
import type { SessionUserDto } from '../../schemas';

export default function CaseDetailPage({ user }: { user: SessionUserDto }) {
  const id = useParams().id ?? '';
  const q = useQuery({ queryKey: ['case', id], queryFn: () => caseService.get(id), enabled: !!id });
  const c = q.data?.data;
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.permissions.includes('*'));
  const canSet = isSuper || user.permissions.includes('call_length:create') || user.permissions.includes('call_length:update');
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

import { formatCallSeconds } from '../../services/caseSync';
import { Dialog } from '../../design-system';

function CallLengthForm({ caseId, current }: { caseId: string; current: string | null }) {
  const [v, setV] = useState(current ?? '');
  const [err, setErr] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);
  const qc = useQueryClient();

  useEffect(() => setV(current ?? ''), [current]);

  const m = useMutation({
    mutationFn: (s: number) => caseService.setCallLength(caseId, s),
    onSuccess: (_, s) => {
      // Directly update cache on the spot so no refresh is needed
      qc.setQueryData(['case', caseId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            callLengthSeconds: s,
            callLengthDisplay: formatCallSeconds(s),
          },
        };
      });
      qc.setQueriesData({ queryKey: ['cases'] }, (old: any) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((item: any) => {
            if (item.id === caseId || item.customer?.id === caseId) {
              return {
                ...item,
                callLengthSeconds: s,
                callLengthDisplay: formatCallSeconds(s),
              };
            }
            return item;
          }),
        };
      });
      qc.invalidateQueries({ queryKey: ['case', caseId] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      recordAudit('CALL_LENGTH_UPDATED', 'case', caseId, {
        durationSeconds: s,
        formatted: formatCallSeconds(s),
      });
      setConfirmOpen(false);
      setConfirmText('');
      setPendingDuration(null);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    m.reset();
    const s = parseDuration(v);
    if (s === null) {
      setErr('Enter duration in seconds (e.g. 120), or mm:ss (e.g. 02:00), or hh:mm:ss (e.g. 00:05:42).');
      return;
    }
    setErr('');

    // If call length was already set, require typing 'yes' to edit
    if (current && current.trim() && current !== 'Not set') {
      setPendingDuration(s);
      setConfirmText('');
      setConfirmOpen(true);
      return;
    }

    m.mutate(s);
  }

  function handleConfirmEdit() {
    if (confirmText.trim().toLowerCase() !== 'yes') return;
    if (pendingDuration !== null) {
      m.mutate(pendingDuration);
    }
  }

  return (
    <>
      <form className="card" onSubmit={submit} noValidate style={{ maxWidth: 420 }} aria-label="Set call length">
        <h2 style={{ margin: 0, fontSize: 18 }}>Call length</h2>
        <TextField
          label="Call duration (seconds like 120, or mm:ss, or hh:mm:ss)"
          placeholder="e.g. 120 or 02:00 or 00:05:42"
          autoComplete="off"
          value={v}
          onChange={setV}
          error={err}
        />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        {m.isSuccess && <p role="status" style={{ color: 'var(--success, #16a34a)', fontWeight: 600 }}>✓ Call length saved.</p>}
        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={m.isPending}>
          {m.isPending ? 'Saving…' : 'Save call length'}
        </button>
      </form>

      {/* Confirmation Dialog requiring typing 'yes' to edit existing call length */}
      <Dialog
        open={confirmOpen}
        title="Confirm call length change"
        onClose={() => {
          setConfirmOpen(false);
          setPendingDuration(null);
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0 }}>
            This case already has a recorded call length of <strong>{current}</strong>.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
            To confirm this change, type <strong>yes</strong> below:
          </p>
          <input
            className="input"
            autoFocus
            placeholder="Type 'yes' to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setConfirmOpen(false);
                setPendingDuration(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={confirmText.trim().toLowerCase() !== 'yes' || m.isPending}
              onClick={handleConfirmEdit}
            >
              {m.isPending ? 'Updating…' : 'Confirm & update'}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
