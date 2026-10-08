import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeService, type Kind, type TxRow } from '../../services/finance';
import { errorMessage } from '../../services/api-client';
import { Pager, StateRows, pageStyle } from '../../design-system';
import type { SessionUserDto } from '../../schemas';
import { CreateExpenseHeadDialog, CreateIncomeHeadDialog, CreateTxDialog, VoidDialog } from './FinanceDialogs';

export default function FinancePage({ kind, user }: { kind: Kind; user: SessionUserDto }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [headId, setHeadId] = useState('');
  const [search, setSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ status: '', dateFrom: '', dateTo: '', headId: '', search: '' });

  const [creating, setCreating] = useState(false);
  const [headOpen, setHeadOpen] = useState(false);
  const [target, setTarget] = useState<TxRow | null>(null);

  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'ADMIN' || user.permissions.includes('*'));
  const income = kind === 'income';
  const can = (p: string) => isSuper || user.permissions.includes(p);

  const incomeHeads = useQuery({
    queryKey: ['income-heads'],
    queryFn: () => financeService.incomeHeads(),
    enabled: income,
  });

  const expenseHeads = useQuery({
    queryKey: ['expense-heads'],
    queryFn: () => financeService.heads(),
    enabled: !income,
  });

  const list = useQuery({
    queryKey: ['finance', kind, page, appliedFilters],
    refetchInterval: 3000,
    queryFn: () => financeService.list(kind, {
      page,
      pageSize: 25,
      status: appliedFilters.status || undefined,
      dateFrom: appliedFilters.dateFrom || undefined,
      dateTo: appliedFilters.dateTo || undefined,
      search: appliedFilters.search || undefined,
      ...(income && appliedFilters.headId ? { incomeHeadId: appliedFilters.headId } : {}),
      ...(!income && appliedFilters.headId ? { expenseHeadId: appliedFilters.headId } : {}),
    }),
  });

  const rows = list.data?.rows ?? [];
  const canVoid = can(income ? 'income:update' : 'expense:update');

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({ status, dateFrom, dateTo, headId, search });
    setPage(1);
  };

  const handleClear = () => {
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setHeadId('');
    setSearch('');
    setAppliedFilters({ status: '', dateFrom: '', dateTo: '', headId: '', search: '' });
    setPage(1);
  };

  const totalFilteredAmount = rows
    .filter((r) => r.status === 'ACTIVE')
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, flex: 1 }}>{income ? 'Income' : 'Expenses'}</h1>
        {income && (isSuper || can('income:create')) && (
          <button className="btn" onClick={() => setHeadOpen(true)}>Add income head</button>
        )}
        {!income && can('expense_head:create') && (
          <button className="btn" onClick={() => setHeadOpen(true)}>Add expense head</button>
        )}
        {can(income ? 'income:create' : 'expense:create') && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            {income ? 'Add income' : 'Add expense'}
          </button>
        )}
      </div>

      <form
        role="search"
        aria-label="Filter"
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginTop: 8 }}
        onSubmit={handleSearch}
      >
        <label style={{ margin: 0 }}>
          {income ? 'Income Head' : 'Expense Head'}
          <select
            className="input"
            value={headId}
            onChange={(e) => setHeadId(e.target.value)}
          >
            <option value="">{income ? 'All Income Heads' : 'All Expense Heads'}</option>
            {income
              ? incomeHeads.data?.data?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)
              : expenseHeads.data?.data?.filter((h) => h.isActive).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>

        <label style={{ margin: 0 }}>
          Status
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="VOIDED">Voided</option>
          </select>
        </label>

        <label style={{ margin: 0 }}>
          From Date
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>

        <label style={{ margin: 0 }}>
          To Date
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>

        <label style={{ margin: 0, minWidth: 160 }}>
          Search
          <input
            className="input"
            type="search"
            placeholder="Search details / remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary">Search</button>
          <button type="button" className="btn" onClick={handleClear}>Clear</button>
        </div>
      </form>

      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 13, color: 'var(--secondary)' }}>
        <span>Showing {rows.length} {income ? 'income entries' : 'expense entries'}</span>
        {rows.length > 0 && (
          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
            Active Total: {totalFilteredAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR
          </span>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            {income ? (
              <tr>
                <th scope="col">Income Head</th>
                <th scope="col">Duration (From Date – To Date)</th>
                <th scope="col">Remarks / Details</th>
                <th scope="col">Amount (PKR)</th>
                <th scope="col">Status</th>
                {canVoid && <th scope="col">Actions</th>}
              </tr>
            ) : (
              <tr>
                <th scope="col">Expense head</th>
                <th scope="col">Remarks / Details</th>
                <th scope="col">Amount</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                {canVoid && <th scope="col">Action</th>}
              </tr>
            )}
          </thead>
          <tbody>
            <StateRows
              loading={list.isLoading}
              empty={!list.isError && rows.length === 0}
              cols={canVoid ? 6 : 5}
              message={`No ${income ? 'income' : 'expenses'} match these filters.`}
            />
            {rows.map((r) => {
              const duration = (r.fromDate && r.toDate)
                ? `${r.fromDate} – ${r.toDate}`
                : (r.fromDate || r.date || '—');

              return (
                <tr key={r.id} style={r.status === 'VOIDED' ? { color: 'var(--secondary)' } : undefined}>
                  <td><strong>{r.category}</strong></td>
                  {income ? (
                    <>
                      <td>{duration}</td>
                      <td>{r.description || r.reference || r.party || '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.amount} PKR</td>
                    </>
                  ) : (
                    <>
                      <td>{r.description || r.reference || r.party || '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.amount} {r.currency}</td>
                      <td>{r.date}</td>
                    </>
                  )}
                  <td>
                    <span className={r.status === 'ACTIVE' ? 'badge b-ACTIVE' : 'badge'}>
                      {r.status === 'VOIDED' ? 'Voided' : 'Active'}
                    </span>
                  </td>
                  {canVoid && (
                    <td>
                      {r.status === 'ACTIVE' && (
                        <button
                          className="btn"
                          aria-label={`Void ${r.category} ${r.amount} on ${r.date}`}
                          onClick={() => setTarget(r)}
                        >
                          Void
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager meta={list.data?.meta} page={page} onPage={setPage} />
      <CreateTxDialog kind={kind} open={creating} onClose={() => setCreating(false)} />
      {income ? (
        <CreateIncomeHeadDialog open={headOpen} onClose={() => setHeadOpen(false)} />
      ) : (
        <CreateExpenseHeadDialog open={headOpen} onClose={() => setHeadOpen(false)} />
      )}
      <VoidDialog kind={kind} target={target} onClose={() => setTarget(null)} />
    </main>
  );
}
