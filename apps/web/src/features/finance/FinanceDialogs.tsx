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

export function CreateIncomeHeadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const qc = useQueryClient();
  const m = useMutation<any>({
    mutationFn: () => financeService.createIncomeHead(name),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['income-heads'] });
      qc.invalidateQueries({ queryKey: ['ceo'] });
      notifyLiveSync('income-head-created');
      const newId = res?.data?.id || res?.id;
      if (onCreated && newId) onCreated(newId);
      setName('');
      onClose();
    },
  });
  useEffect(() => { if (open) { setName(''); setErr(''); m.reset(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Income head name is required.'); return; }
    setErr('');
    m.mutate();
  }
  return (
    <Dialog open={open} title="Add income head" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p style={{ margin: '0 0 12px' }}>Create a new income category head (e.g. Consulting, Medicare Commission, Retainer, Referral Fee).</p>
        <TextField label="Income head name" required autoComplete="off" value={name} onChange={setName} error={err} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} label="Add income head" />
      </form>
    </Dialog>
  );
}

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
  const income = kind === 'income';
  const [f, setF] = useState(blank());
  const [err, setErr] = useState<Record<string, string>>({});
  const [headOpen, setHeadOpen] = useState(false);
  const qc = useQueryClient();

  const expenseHeads = useQuery({ queryKey: ['expense-heads'], queryFn: () => financeService.heads(), enabled: open && !income });
  const incomeHeads = useQuery({ queryKey: ['income-heads'], queryFn: () => financeService.incomeHeads(), enabled: open && income });

  const m = useMutation<any>({
    mutationFn: () => financeService.create(kind, f),
    onSuccess: (res) => {
      recordAudit(income ? 'INCOME_CREATED' : 'EXPENSE_CREATED', income ? 'income' : 'expense', res?.data?.id || 'tx', {
        amount: f.amount,
        head: f.category || f.incomeHeadId || f.expenseHeadId,
      });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['income-heads'] });
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

  useEffect(() => {
    if (open) {
      const b = blank();
      if (income) {
        b.fromDate = today();
        b.toDate = today();
      }
      setF(b);
      setErr({});
      m.reset();
    }
  }, [open, income]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof TxForm) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!isMoney(f.amount) || Number(f.amount) <= 0) {
      x.amount = 'Enter a valid positive amount (e.g. 1500.00).';
    }

    if (income) {
      if (!f.incomeHeadId && !f.category) x.incomeHeadId = 'Please select an income head.';
      if (!f.fromDate) x.fromDate = 'From date is required.';
      if (!f.toDate) x.toDate = 'To date is required.';
      if (f.fromDate && f.toDate && f.fromDate > f.toDate) {
        x.toDate = 'To date cannot be earlier than From date.';
      }
    } else {
      if (!f.date) x.date = 'Date is required.';
      if (!f.expenseHeadId) x.expenseHeadId = 'Choose an expense head.';
    }

    setErr(x);
    if (!Object.keys(x).length) {
      // For income, synchronize date with fromDate if date isn't set
      if (income && !f.date) {
        f.date = f.fromDate || today();
      }
      m.mutate();
    }
  }

  return (
    <>
      <Dialog open={open} title={income ? 'Add income' : 'Add expense'} onClose={onClose}>
        <form onSubmit={submit} noValidate>
          {income ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="income-head" style={{ margin: 0, fontWeight: 600 }}>Income Head *</label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px', fontSize: 13, color: 'var(--primary)' }}
                  onClick={() => setHeadOpen(true)}
                >
                  + New head
                </button>
              </div>
              <select
                id="income-head"
                className="input"
                style={{ marginTop: 5, width: '100%', height: 40 }}
                value={f.incomeHeadId}
                onChange={(e) => {
                  const selId = e.target.value;
                  const found = incomeHeads.data?.data?.find((h) => h.id === selId);
                  setF((prev) => ({
                    ...prev,
                    incomeHeadId: selId,
                    category: found ? found.name : prev.category,
                  }));
                }}
                aria-invalid={!!err.incomeHeadId}
                required
              >
                <option value="">{incomeHeads.isLoading ? 'Loading income heads…' : 'Choose income head…'}</option>
                {incomeHeads.data?.data?.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              {(err.incomeHeadId || incomeHeads.isError) && (
                <span className="err" role="alert">{err.incomeHeadId ?? errorMessage(incomeHeads.error)}</span>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <TextField
                  label="From Date"
                  type="date"
                  required
                  value={f.fromDate ?? ''}
                  onChange={(val) => setF((prev) => ({ ...prev, fromDate: val, date: prev.date || val }))}
                  error={err.fromDate}
                />
                <TextField
                  label="To Date"
                  type="date"
                  required
                  value={f.toDate ?? ''}
                  onChange={set('toDate')}
                  error={err.toDate}
                />
              </div>

              <TextField
                label="Amount (PKR)"
                inputMode="decimal"
                autoComplete="off"
                placeholder="e.g. 50000"
                required
                value={f.amount}
                onChange={set('amount')}
                error={err.amount}
              />
              <TextField
                label="Remarks / Details"
                placeholder="Reference or income details..."
                value={f.description ?? ''}
                onChange={set('description')}
              />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="expense-head" style={{ margin: 0, fontWeight: 600 }}>Expense head *</label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px', fontSize: 13, color: 'var(--primary)' }}
                  onClick={() => setHeadOpen(true)}
                >
                  + New head
                </button>
              </div>
              <select
                id="expense-head"
                className="input"
                style={{ marginTop: 5, width: '100%', height: 40 }}
                value={f.expenseHeadId}
                onChange={(e) => set('expenseHeadId')(e.target.value)}
                aria-invalid={!!err.expenseHeadId}
                required
              >
                <option value="">{expenseHeads.isLoading ? 'Loading…' : 'Choose expense head…'}</option>
                {expenseHeads.data?.data.filter((h) => h.isActive).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              {(err.expenseHeadId || expenseHeads.isError) && (
                <span className="err" role="alert">{err.expenseHeadId ?? errorMessage(expenseHeads.error)}</span>
              )}
              <TextField label="Remarks / Details" placeholder="e.g. Office maintenance or Bill reference" value={f.description ?? ''} onChange={set('description')} />
              <TextField label="Amount" inputMode="decimal" autoComplete="off" required value={f.amount} onChange={set('amount')} error={err.amount} />
              <TextField label="Date" type="date" required value={f.date} onChange={set('date')} error={err.date} />
            </>
          )}

          {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
          <Actions onClose={onClose} busy={m.isPending} label="Save" />
        </form>
      </Dialog>
      {income ? (
        <CreateIncomeHeadDialog
          open={headOpen}
          onClose={() => setHeadOpen(false)}
          onCreated={(newId) => set('incomeHeadId')(newId)}
        />
      ) : (
        <CreateExpenseHeadDialog
          open={headOpen}
          onClose={() => setHeadOpen(false)}
          onCreated={(newId) => set('expenseHeadId')(newId)}
        />
      )}
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
