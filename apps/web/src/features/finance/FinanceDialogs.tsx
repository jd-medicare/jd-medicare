import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeService, type Kind, type TxForm, type TxRow } from '../../services/finance';
import { errorMessage } from '../../services/api-client';
import { Dialog, TextField } from '../../design-system';
import { isMoney, today } from '../../lib/format';

const blank = (): TxForm => ({ amount: '', date: today(), category: '', expenseHeadId: '', payee: '', reference: '', description: '' });
const Actions = ({ onClose, busy, label, danger, disabled }: { onClose: () => void; busy: boolean; label: string; danger?: boolean; disabled?: boolean }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
    <button type="button" className="btn" onClick={onClose}>Cancel</button>
    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy || disabled}>{label}</button>
  </div>);

export function CreateTxDialog({ kind, open, onClose }: { kind: Kind; open: boolean; onClose: () => void }) {
  const income = kind === 'income'; const [f, setF] = useState(blank()); const [err, setErr] = useState<Record<string, string>>({}); const qc = useQueryClient();
  const heads = useQuery({ queryKey: ['expense-heads'], queryFn: () => financeService.heads(), enabled: open && !income });
  const m = useMutation<any>({ mutationFn: () => financeService.create(kind, f), onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); onClose(); } });
  useEffect(() => { if (open) { setF(blank()); setErr({}); m.reset(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof TxForm) => (v: string) => setF({ ...f, [k]: v });
  function submit(e: FormEvent) {
    e.preventDefault(); const x: Record<string, string> = {};
    if (!isMoney(f.amount)) x.amount = 'Enter an amount like 1250.50 (digits and up to two decimals).';
    if (!f.date) x.date = 'Date is required.';
    if (income && !f.category?.trim()) x.category = 'Category is required.';
    if (!income && !f.expenseHeadId) x.expenseHeadId = 'Choose an expense head.';
    setErr(x); if (!Object.keys(x).length) m.mutate();
  }
  return (
    <Dialog open={open} title={income ? 'Add income' : 'Add expense'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <TextField label="Amount" inputMode="decimal" autoComplete="off" required value={f.amount} onChange={set('amount')} error={err.amount} />
        <TextField label="Date" type="date" required value={f.date} onChange={set('date')} error={err.date} />
        {income ? <TextField label="Category" required value={f.category ?? ''} onChange={set('category')} error={err.category} /> : (<>
          <label htmlFor="expense-head">Expense head</label>
          <select id="expense-head" className="input" value={f.expenseHeadId} onChange={(e) => set('expenseHeadId')(e.target.value)} aria-invalid={!!err.expenseHeadId} required>
            <option value="">{heads.isLoading ? 'Loading…' : 'Choose…'}</option>{heads.data?.data.filter((h) => h.isActive).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
          {(err.expenseHeadId || heads.isError) && <span className="err" role="alert">{err.expenseHeadId ?? errorMessage(heads.error)}</span>}
          <TextField label="Payee (optional)" value={f.payee ?? ''} onChange={set('payee')} /></>)}
        <TextField label="Reference (optional)" value={f.reference ?? ''} onChange={set('reference')} />
        <TextField label="Description (optional)" value={f.description ?? ''} onChange={set('description')} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} label="Save" />
      </form>
    </Dialog>
  );
}

export function VoidDialog({ kind, target, onClose }: { kind: Kind; target: TxRow | null; onClose: () => void }) {
  const [reason, setReason] = useState(''); const [text, setText] = useState(''); const qc = useQueryClient();
  const m = useMutation<any>({ mutationFn: () => financeService.void(kind, target!.id, reason.trim()), onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); onClose(); } });
  useEffect(() => { setReason(''); setText(''); m.reset(); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={!!target} title={kind === 'income' ? 'Void this income entry' : 'Void this expense'} onClose={onClose}>
      {target && <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <p>{target.category}, {target.amount} {target.currency} on {target.date}. Voided entries stay on record but no longer count in totals.</p>
        <TextField label="Reason for voiding" required autoComplete="off" value={reason} onChange={setReason} />
        <TextField label="Type CONFIRM to continue" autoComplete="off" value={text} onChange={setText} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} disabled={text !== 'CONFIRM' || !reason.trim()} label="Void entry" danger />
      </form>}
    </Dialog>
  );
}
