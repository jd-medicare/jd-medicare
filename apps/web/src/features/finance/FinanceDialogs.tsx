import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeService, type Kind, type TxForm, type TxRow } from '../../services/finance';
import { errorMessage } from '../../services/api-client';
import { Dialog, TextField } from '../../design-system';
import { isMoney, today } from '../../lib/format';
import { recordAudit } from '../../services/audit';
import { notifyLiveSync } from '../../services/liveSync';

const blank = (): TxForm => ({ amount: '', date: today(), category: '', expenseHeadId: '', payee: '', reference: '', description: '' });
const Actions = ({ onClose, busy, label, danger, disabled }: { onClose: () => void; busy: boolean; label: string; danger?: boolean; disabled?: boolean }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
    <button type="button" className="btn" onClick={onClose}>Cancel</button>
    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy || disabled}>{label}</button>
  </div>);

export function CreateExpenseHeadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const qc = useQueryClient();
  const m = useMutation<any>({
    mutationFn: () => financeService.createHead(name),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['expense-heads'] });
      qc.invalidateQueries({ queryKey: ['ceo'] });
      notifyLiveSync('expense-head-created');
      if (onCreated && res?.data?.id) onCreated(res.data.id);
      setName('');
      onClose();
    },
  });
  useEffect(() => { if (open) { setName(''); setErr(''); m.reset(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Expense head name is required.'); return; }
    setErr('');
    m.mutate();
  }
  return (
    <Dialog open={open} title="Add expense head" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p style={{ margin: '0 0 12px' }}>Create a new expense category head (e.g. Office Supplies, Travel, Software, Utilities).</p>
        <TextField label="Expense head name" required autoComplete="off" value={name} onChange={setName} error={err} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} label="Add expense head" />
      </form>
    </Dialog>
  );
}

export function CreateTxDialog({ kind, open, onClose }: { kind: Kind; open: boolean; onClose: () => void }) {
  const income = kind === 'income'; const [f, setF] = useState(blank()); const [err, setErr] = useState<Record<string, string>>({}); const [headOpen, setHeadOpen] = useState(false); const qc = useQueryClient();
  const heads = useQuery({ queryKey: ['expense-heads'], queryFn: () => financeService.heads(), enabled: open && !income });
  const m = useMutation<any>({
    mutationFn: () => financeService.create(kind, f),
    onSuccess: (res) => {
      recordAudit(income ? 'INCOME_CREATED' : 'EXPENSE_CREATED', income ? 'income' : 'expense', res?.data?.id || 'tx', { amount: f.amount, head: f.category || f.expenseHeadId });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
      qc.invalidateQueries({ queryKey: ['ceo'] });
      qc.invalidateQueries({ queryKey: ['ceo-expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-heads'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      notifyLiveSync(income ? 'income-created' : 'expense-created', res?.data);
      onClose();
    },
  });
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
    <>
      <Dialog open={open} title={income ? 'Add income' : 'Add expense'} onClose={onClose}>
        <form onSubmit={submit} noValidate>
          {!income ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="expense-head" style={{ margin: 0, fontWeight: 600 }}>Expense head *</label>
                <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 13, color: 'var(--primary)' }} onClick={() => setHeadOpen(true)}>+ New head</button>
              </div>
              <select id="expense-head" className="input" style={{ marginTop: 5, width: '100%', height: 40 }} value={f.expenseHeadId} onChange={(e) => set('expenseHeadId')(e.target.value)} aria-invalid={!!err.expenseHeadId} required>
                <option value="">{heads.isLoading ? 'Loading…' : 'Choose expense head…'}</option>
                {heads.data?.data.filter((h) => h.isActive).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {(err.expenseHeadId || heads.isError) && <span className="err" role="alert">{err.expenseHeadId ?? errorMessage(heads.error)}</span>}
              <TextField label="Remarks / Details" placeholder="e.g. Office maintenance or Bill reference" value={f.description ?? ''} onChange={set('description')} />
            </>
          ) : (
            <>
              <TextField label="Category" required value={f.category ?? ''} onChange={set('category')} error={err.category} />
              <TextField label="Remarks / Details" placeholder="Reference or remarks" value={f.description ?? ''} onChange={set('description')} />
            </>
          )}
          <TextField label="Amount" inputMode="decimal" autoComplete="off" required value={f.amount} onChange={set('amount')} error={err.amount} />
          <TextField label="Date" type="date" required value={f.date} onChange={set('date')} error={err.date} />
          {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
          <Actions onClose={onClose} busy={m.isPending} label="Save" />
        </form>
      </Dialog>
      <CreateExpenseHeadDialog open={headOpen} onClose={() => setHeadOpen(false)} onCreated={(newId) => set('expenseHeadId')(newId)} />
    </>
  );
}

export function VoidDialog({ kind, target, onClose }: { kind: Kind; target: TxRow | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();
  const m = useMutation<any>({
    mutationFn: () => financeService.void(kind, target!.id, reason.trim() || 'Voided by user'),
    onSuccess: () => {
      recordAudit(kind === 'income' ? 'INCOME_VOIDED' : 'EXPENSE_VOIDED', kind, target!.id, { amount: target!.amount, category: target!.category, reason: reason.trim() });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
      qc.invalidateQueries({ queryKey: ['ceo'] });
      qc.invalidateQueries({ queryKey: ['ceo-expenses'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      notifyLiveSync(kind === 'income' ? 'income-voided' : 'expense-voided');
      onClose();
    },
  });
  useEffect(() => { setReason(''); m.reset(); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={!!target} title={kind === 'income' ? 'Void this income entry' : 'Void this expense'} onClose={onClose}>
      {target && <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <p>{target.category}, {target.amount} {target.currency} on {target.date}. Voided entries stay on record but no longer count in totals.</p>
        <TextField label="Reason for voiding (optional)" autoComplete="off" value={reason} onChange={setReason} placeholder="Reason for voiding..." />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} label="Void entry" danger />
      </form>}
    </Dialog>
  );
}
