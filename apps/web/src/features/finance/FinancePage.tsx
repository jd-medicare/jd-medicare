import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeService, type Kind, type TxRow } from '../../services/finance';
import { errorMessage } from '../../services/api-client';
import { Pager, StateRows, pageStyle } from '../../design-system';
import type { SessionUserDto } from '../../schemas';
import { CreateExpenseHeadDialog, CreateTxDialog, VoidDialog } from './FinanceDialogs';

export default function FinancePage({ kind, user }: { kind: Kind; user: SessionUserDto }) {
  const [page, setPage] = useState(1); const [status, setStatus] = useState(''); const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  const [creating, setCreating] = useState(false); const [headOpen, setHeadOpen] = useState(false); const [target, setTarget] = useState<TxRow | null>(null);
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'ADMIN' || user.permissions.includes('*'));
  const income = kind === 'income'; const can = (p: string) => isSuper || user.permissions.includes(p);
  const list = useQuery({
    queryKey: ['finance', kind, page, status, dateFrom, dateTo],
    refetchInterval: 3000,
    queryFn: () => financeService.list(kind, { page, pageSize: 25, status, dateFrom, dateTo }),
  });
  const rows = list.data?.rows ?? []; const reset = (fn: () => void) => { fn(); setPage(1); };
  const canVoid = can(income ? 'income:update' : 'expense:update'); const cols = income ? 6 : 7;
  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, flex: 1 }}>{income ? 'Income' : 'Expenses'}</h1>
        {!income && can('expense_head:create') && (
          <button className="btn" onClick={() => setHeadOpen(true)}>Add expense head</button>
        )}
        {can(income ? 'income:create' : 'expense:create') && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>{income ? 'Add income' : 'Add expense'}</button>
        )}
      </div>
      <form role="search" aria-label="Filter" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }} onSubmit={(e) => e.preventDefault()}>
        <label style={{ margin: 0 }}>Status<select className="input" value={status} onChange={(e) => reset(() => setStatus(e.target.value))}><option value="">All</option><option value="ACTIVE">Active</option><option value="VOIDED">Voided</option></select></label>
        <label style={{ margin: 0 }}>From<input className="input" type="date" value={dateFrom} onChange={(e) => reset(() => setDateFrom(e.target.value))} /></label>
        <label style={{ margin: 0 }}>To<input className="input" type="date" value={dateTo} onChange={(e) => reset(() => setDateTo(e.target.value))} /></label>
      </form>
      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}
      <div className="table-wrap"><table>
        <thead>
          <tr>
            <th scope="col">{income ? 'Category' : 'Expense head'}</th>
            <th scope="col">Remarks / Details</th>
            <th scope="col">Amount</th>
            <th scope="col">Date</th>
            <th scope="col">Status</th>
            {canVoid && <th scope="col">Action</th>}
          </tr>
        </thead>
        <tbody>
          <StateRows loading={list.isLoading} empty={!list.isError && rows.length === 0} cols={canVoid ? 6 : 5} message={`No ${income ? 'income' : 'expenses'} match these filters.`} />
          {rows.map((r) => (
            <tr key={r.id} style={r.status === 'VOIDED' ? { color: 'var(--secondary)' } : undefined}>
              <td><strong>{r.category}</strong></td>
              <td>{r.description || r.reference || r.party || '—'}</td>
              <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.amount} {r.currency}</td>
              <td>{r.date}</td>
              <td><span className={r.status === 'ACTIVE' ? 'badge b-ACTIVE' : 'badge'}>{r.status === 'VOIDED' ? 'Voided' : 'Active'}</span></td>
              {canVoid && <td>{r.status === 'ACTIVE' && <button className="btn" aria-label={`Void ${r.category} ${r.amount} on ${r.date}`} onClick={() => setTarget(r)}>Void</button>}</td>}
            </tr>))}
        </tbody></table></div>
      <Pager meta={list.data?.meta} page={page} onPage={setPage} />
      <CreateTxDialog kind={kind} open={creating} onClose={() => setCreating(false)} />
      <CreateExpenseHeadDialog open={headOpen} onClose={() => setHeadOpen(false)} />
      <VoidDialog kind={kind} target={target} onClose={() => setTarget(null)} />
    </main>
  );
}
