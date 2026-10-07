import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CEO_RANGES } from '@shared/enums';
import { reportService } from '../../services/reports';
import { financeService } from '../../services/finance';
import { errorMessage } from '../../services/api-client';
import { Loading, pageStyle } from '../../design-system';
import { fmtSeconds } from '../../lib/format';

const RANGE_LABEL: Record<string, string> = {
  TODAY: 'Today',
  THIS_WEEK: 'This week',
  THIS_MONTH: 'This month',
  PREVIOUS_MONTH: 'Previous month',
  YEAR_TO_DATE: 'Year to date',
  CUSTOM: 'Custom range',
};

// Clean, decent SVG icons (replaces emojis)
const ChartIcon = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const CoinsIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="7" rx="9" ry="3" />
    <path d="M3 7v6c0 1.66 4.03 3 9 3s9-1.34 9-3V7" />
    <path d="M3 13v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
  </svg>
);

const GearIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CalendarIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UsersIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DocIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const ClockIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CrossIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export default function CeoDashboardPage() {
  const [range, setRange] = useState('THIS_MONTH');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [financeType, setFinanceType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [expenseHead, setExpenseHead] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{
    range: string;
    dateFrom: string;
    dateTo: string;
    financeType: 'ALL' | 'INCOME' | 'EXPENSE';
    expenseHead: string;
  }>({
    range: 'THIS_MONTH',
    dateFrom: '',
    dateTo: '',
    financeType: 'ALL',
    expenseHead: '',
  });

  const headsQ = useQuery({
    queryKey: ['expense-heads'],
    queryFn: () => financeService.heads(),
    refetchInterval: 3000,
  });
  const expenseHeads = headsQ.data?.data || [];

  const expensesQ = useQuery({
    queryKey: ['ceo-expenses'],
    queryFn: () => financeService.list('expense', { pageSize: 100 }),
    refetchInterval: 3000,
  });
  const allExpenses = expensesQ.data?.rows || [];

  const custom = appliedFilters.range === 'CUSTOM';
  const customReady = !custom || (!!appliedFilters.dateFrom && !!appliedFilters.dateTo);

  const q = useQuery({
    queryKey: ['ceo', appliedFilters.range, custom ? appliedFilters.dateFrom : '', custom ? appliedFilters.dateTo : ''],
    enabled: customReady,
    refetchInterval: 3000,
    queryFn: () =>
      reportService.ceoDashboard({
        range: appliedFilters.range,
        dateFrom: custom ? appliedFilters.dateFrom : undefined,
        dateTo: custom ? appliedFilters.dateTo : undefined,
      }),
  });

  const d = q.data?.data;

  // Filter expenses and compute breakdown by expense head
  const { filteredExpenses, headBreakdown, totalHeadExpense } = useMemo(() => {
    const fromDate = appliedFilters.dateFrom || (d?.range.dateFrom ? d.range.dateFrom : '');
    const toDate = appliedFilters.dateTo || (d?.range.dateTo ? d.range.dateTo : '');

    const activeList = allExpenses.filter((e) => e.status !== 'VOIDED');
    const inDateRange = activeList.filter((e) => {
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    });

    const headMap = new Map<string, { headName: string; totalAmount: number; count: number }>();
    for (const h of expenseHeads) {
      headMap.set(h.name, { headName: h.name, totalAmount: 0, count: 0 });
    }
    let allDateExpensesSum = 0;
    for (const exp of inDateRange) {
      const hName = exp.category || 'General';
      const amt = parseFloat(exp.amount) || 0;
      allDateExpensesSum += amt;
      const curr = headMap.get(hName) || { headName: hName, totalAmount: 0, count: 0 };
      curr.totalAmount += amt;
      curr.count += 1;
      headMap.set(hName, curr);
    }

    const breakdown = Array.from(headMap.values()).map((item) => ({
      ...item,
      share: allDateExpensesSum > 0 ? Math.round((item.totalAmount / allDateExpensesSum) * 100) : 0,
    }));
    breakdown.sort((a, b) => b.totalAmount - a.totalAmount);

    let filtered = inDateRange;
    if (appliedFilters.expenseHead) {
      filtered = filtered.filter((e) => e.category === appliedFilters.expenseHead);
    }

    const sum = filtered.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    return {
      filteredExpenses: filtered,
      headBreakdown: breakdown,
      totalHeadExpense: sum,
    };
  }, [allExpenses, expenseHeads, appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.expenseHead, d?.range.dateFrom, d?.range.dateTo]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedFilters({
      range,
      dateFrom,
      dateTo,
      financeType,
      expenseHead,
    });
  }

  function handleClear() {
    setRange('THIS_MONTH');
    setDateFrom('');
    setDateTo('');
    setFinanceType('ALL');
    setExpenseHead('');
    setAppliedFilters({
      range: 'THIS_MONTH',
      dateFrom: '',
      dateTo: '',
      financeType: 'ALL',
      expenseHead: '',
    });
  }

  return (
    <main style={{ ...pageStyle, maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header with Icon badge & date range display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <ChartIcon size={22} color="#d97706" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
              CEO dashboard
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {d && (
            <div style={{ fontSize: 13, color: 'var(--muted, #94a3b8)', fontWeight: 500 }}>
              Showing {d.range.dateFrom} to {d.range.dateTo}
            </div>
          )}
          <Link
            to="/reports"
            className="btn btn-primary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 8,
            }}
          >
            <DocIcon size={14} color="#ffffff" /> Cases Breakdown Report →
          </Link>
        </div>
      </div>

      {/* Filter Bar - Single Clean Row */}
      <form
        onSubmit={handleSearch}
        aria-label="CEO dashboard filters"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 12,
          padding: '16px 20px',
          background: 'var(--card-bg, #ffffff)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 180px', minWidth: 140 }}>
          <label htmlFor="ceo-range" style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Range
          </label>
          <select
            id="ceo-range"
            className="input"
            style={{ height: 40, width: '100%', borderRadius: 8 }}
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              if (e.target.value !== 'CUSTOM') {
                setAppliedFilters((prev) => ({ ...prev, range: e.target.value }));
              }
            }}
          >
            {CEO_RANGES.map((r) => (
              <option key={r} value={r}>
                {RANGE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 150px', minWidth: 130 }}>
          <label htmlFor="ceo-from" style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            From
          </label>
          <input
            id="ceo-from"
            className="input"
            type="date"
            style={{ height: 40, width: '100%', borderRadius: 8 }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              if (range !== 'CUSTOM') setRange('CUSTOM');
            }}
          />
        </div>

        <div style={{ flex: '1 1 150px', minWidth: 130 }}>
          <label htmlFor="ceo-to" style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            To
          </label>
          <input
            id="ceo-to"
            className="input"
            type="date"
            style={{ height: 40, width: '100%', borderRadius: 8 }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              if (range !== 'CUSTOM') setRange('CUSTOM');
            }}
          />
        </div>

        <div style={{ flex: '1 1 180px', minWidth: 150 }}>
          <label htmlFor="ceo-type" style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Type
          </label>
          <select
            id="ceo-type"
            className="input"
            style={{ height: 40, width: '100%', borderRadius: 8 }}
            value={financeType}
            onChange={(e) => setFinanceType(e.target.value as any)}
          >
            <option value="ALL">All financial types</option>
            <option value="INCOME">Income only</option>
            <option value="EXPENSE">Expense only</option>
          </select>
        </div>

        <div style={{ flex: '1 1 180px', minWidth: 150 }}>
          <label htmlFor="ceo-expense-head" style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Expense head
          </label>
          <select
            id="ceo-expense-head"
            className="input"
            style={{ height: 40, width: '100%', borderRadius: 8 }}
            value={expenseHead}
            onChange={(e) => setExpenseHead(e.target.value)}
          >
            <option value="">All expense heads</option>
            {expenseHeads.map((h) => (
              <option key={h.id} value={h.name}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, height: 40, flex: '0 0 auto' }}>
          <button
            type="submit"
            className="btn"
            style={{
              height: 40,
              padding: '0 22px',
              borderRadius: 8,
              background: '#461440',
              color: '#ffffff',
              fontWeight: 700,
              border: 'none',
              boxShadow: '0 2px 8px rgba(70, 20, 64, 0.3)',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
          <button
            type="button"
            className="btn"
            style={{ height: 40, padding: '0 18px', borderRadius: 8, cursor: 'pointer' }}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </form>

      {!customReady && <p style={{ color: 'var(--muted, #94a3b8)' }}>Choose both dates to load the custom range.</p>}
      {q.isLoading && customReady && <Loading />}
      {q.isError && <p className="err" role="alert">{errorMessage(q.error)}</p>}

      {d && (
        <div style={{ display: 'grid', gap: 26 }}>
          {/* SECTION 1: FINANCE */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                }}
              >
                <CoinsIcon size={18} color="#d97706" />
              </span>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Finance</h2>
            </div>

            {d.finance ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 18 }}>
                  {/* Income Card */}
                  <div
                    className="card"
                    style={{
                      padding: '20px 24px',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted, #64748b)', fontSize: 13, fontWeight: 600 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckIcon size={12} color="#16a34a" />
                        </span>
                        Income
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
                        {d.finance.totalIncome} {d.finance.currency} <span style={{ fontSize: 18 }}>↓</span>
                      </div>
                    </div>
                    {/* Mini Sparkline SVG */}
                    <svg width="70" height="35" viewBox="0 0 70 35" fill="none">
                      <path d="M2 30L20 22L38 25L52 10L68 6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Expenses Card */}
                  <div
                    className="card"
                    style={{
                      padding: '20px 24px',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted, #64748b)', fontSize: 13, fontWeight: 600 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <RefreshIcon size={12} color="#ef4444" />
                        </span>
                        Expenses
                        {appliedFilters.expenseHead && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#461440', color: '#fff', fontWeight: 600 }}>
                            {appliedFilters.expenseHead}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 8 }}>
                        {appliedFilters.expenseHead
                          ? `${totalHeadExpense.toLocaleString()} ${d.finance.currency}`
                          : `${d.finance.totalExpenses} ${d.finance.currency}`} <span style={{ fontSize: 18 }}>↑</span>
                      </div>
                    </div>
                    {/* Mini Sparkline SVG */}
                    <svg width="70" height="35" viewBox="0 0 70 35" fill="none">
                      <path d="M2 18L18 26L34 14L50 22L68 6" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Net Position Card */}
                  <div
                    className="card"
                    style={{
                      padding: '20px 24px',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted, #64748b)', fontSize: 13, fontWeight: 600 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DocIcon size={12} color="#0284c7" />
                        </span>
                        Net position
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
                        {d.finance.netPosition} {d.finance.currency} <span style={{ fontSize: 18 }}>↑</span>
                      </div>
                    </div>
                    {/* Mini Sparkline SVG */}
                    <svg width="70" height="35" viewBox="0 0 70 35" fill="none">
                      <path d="M2 28L22 20L40 22L54 12L68 4" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Income vs Expenses by Month Table */}
                <div className="card" style={{ padding: '18px 22px', borderRadius: 14, border: '1px solid var(--border)', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                      <ChartIcon size={16} color="#d97706" />
                    </span>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                      Income vs expenses by month
                    </h3>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">MONTH</th>
                          <th scope="col">INCOME</th>
                          <th scope="col">EXPENSES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.trends.incomeVsExpenseByMonth.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>No financial records in this period.</td>
                          </tr>
                        ) : (
                          d.trends.incomeVsExpenseByMonth.map((r) => (
                            <tr key={r.month}>
                              <td><strong>{r.month}</strong></td>
                              <td style={{ color: '#16a34a', fontWeight: 600 }}>{r.income}</td>
                              <td style={{ color: '#ef4444', fontWeight: 600 }}>{r.expenses}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dedicated Expense Breakdown by Head Section */}
                <div className="card" style={{ padding: '20px 24px', borderRadius: 14, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <CoinsIcon size={16} color="#ef4444" />
                      </span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                          Expense breakdown by head
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted, #94a3b8)' }}>
                          {appliedFilters.expenseHead ? `Filtered for ${appliedFilters.expenseHead}` : 'Expenditure metrics grouped by expense head'}
                        </p>
                      </div>
                    </div>
                    {appliedFilters.expenseHead && (
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: '4px 10px', height: 28 }}
                        onClick={() => {
                          setExpenseHead('');
                          setAppliedFilters((prev) => ({ ...prev, expenseHead: '' }));
                        }}
                      >
                        ✕ Clear head filter
                      </button>
                    )}
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">EXPENSE HEAD</th>
                          <th scope="col">TRANSACTIONS</th>
                          <th scope="col">TOTAL AMOUNT</th>
                          <th scope="col">SHARE</th>
                          <th scope="col">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {headBreakdown.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                              No expense records found.
                            </td>
                          </tr>
                        ) : (
                          headBreakdown.map((hb) => {
                            const isSelected = appliedFilters.expenseHead === hb.headName;
                            return (
                              <tr key={hb.headName} style={{ background: isSelected ? 'rgba(70, 20, 64, 0.05)' : undefined }}>
                                <td>
                                  <strong>{hb.headName}</strong>
                                  {isSelected && (
                                    <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#461440', color: '#fff', fontWeight: 600 }}>
                                      Active Filter
                                    </span>
                                  )}
                                </td>
                                <td>{hb.count}</td>
                                <td style={{ color: '#ef4444', fontWeight: 700 }}>
                                  {hb.totalAmount.toLocaleString()} PKR
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(100, hb.share)}%`, height: '100%', background: '#ef4444' }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{hb.share}%</span>
                                  </div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn"
                                    style={{
                                      fontSize: 11,
                                      padding: '2px 8px',
                                      height: 24,
                                      background: isSelected ? 'var(--border)' : undefined,
                                    }}
                                    onClick={() => {
                                      const next = isSelected ? '' : hb.headName;
                                      setExpenseHead(next);
                                      setAppliedFilters((prev) => ({ ...prev, expenseHead: next }));
                                    }}
                                  >
                                    {isSelected ? 'Clear' : 'Filter by head'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Filtered Recent Entries */}
                  {filteredExpenses.length > 0 && (
                    <div style={{ marginTop: 22, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: 'var(--muted, #64748b)' }}>
                        Expense entries {appliedFilters.expenseHead ? `(${appliedFilters.expenseHead})` : ''}
                      </h4>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col">DATE</th>
                              <th scope="col">EXPENSE HEAD</th>
                              <th scope="col">REMARKS / DETAILS</th>
                              <th scope="col">REFERENCE</th>
                              <th scope="col">AMOUNT</th>
                              <th scope="col">STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredExpenses.slice(0, 20).map((exp) => (
                              <tr key={exp.id}>
                                <td>{exp.date}</td>
                                <td><strong>{exp.category}</strong></td>
                                <td>{exp.description || '—'}</td>
                                <td>{exp.reference || '—'}</td>
                                <td style={{ color: '#ef4444', fontWeight: 700 }}>
                                  {exp.amount} {exp.currency}
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    background: exp.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: exp.status === 'ACTIVE' ? '#16a34a' : '#ef4444',
                                    fontWeight: 600,
                                  }}>
                                    {exp.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="card" role="note">Finance figures are not available for your account.</p>
            )}
          </section>

          {/* SECTION 2: OPERATIONS */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706',
                  }}
                >
                  <GearIcon size={18} color="#d97706" />
                </span>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Operations</h2>
              </div>
              <Link
                to="/reports"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                View full cases report by user & date →
              </Link>
            </div>

            {/* 8 Operations Cards in Grid matching Screenshot 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
              {/* Total Records */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DocIcon size={13} color="#6366f1" />
                  </span>
                  Total records
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
                  {d.operations.totalRecords}
                </div>
              </div>

              {/* New Records */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UsersIcon size={13} color="#d97706" />
                  </span>
                  New records
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
                  {d.operations.newRecords}
                </div>
              </div>

              {/* Pending */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClockIcon size={13} color="#ea580c" />
                  </span>
                  Pending
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
                  {d.operations.pending}
                </div>
              </div>

              {/* Accepted */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={13} color="#16a34a" />
                  </span>
                  Accepted
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#16a34a' }}>
                  {d.operations.accepted}
                </div>
              </div>

              {/* Rejected */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CrossIcon size={13} color="#ef4444" />
                  </span>
                  Rejected
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>
                  {d.operations.rejected}
                </div>
              </div>

              {/* Processed Rate */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(20, 184, 166, 0.15)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshIcon size={13} color="#0d9488" />
                  </span>
                  Processed
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
                  {d.operations.processingRate}%
                </div>
              </div>

              {/* Acceptance Rate */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={13} color="#16a34a" />
                  </span>
                  Acceptance
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#16a34a' }}>
                  {d.operations.acceptanceRate}%
                </div>
              </div>

              {/* Rejection Rate */}
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CrossIcon size={13} color="#ef4444" />
                  </span>
                  Rejection
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>
                  {d.operations.rejectionRate}%
                </div>
              </div>
            </div>

            {/* Records by Date Table */}
            <div className="card" style={{ padding: '18px 22px', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <CalendarIcon size={16} color="#d97706" />
                </span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Records by date</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">DATE</th>
                      <th scope="col">TOTAL</th>
                      <th scope="col">ACCEPTED</th>
                      <th scope="col">REJECTED</th>
                      <th scope="col">PENDING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.trends.recordsByDate.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>No data in this range.</td>
                      </tr>
                    ) : (
                      d.trends.recordsByDate.map((r) => (
                        <tr key={r.date}>
                          <td><strong>{r.date}</strong></td>
                          <td>{r.total}</td>
                          <td style={{ color: '#16a34a', fontWeight: 600 }}>{r.accepted}</td>
                          <td style={{ color: '#ef4444', fontWeight: 600 }}>{r.rejected}</td>
                          <td style={{ color: '#ea580c', fontWeight: 600 }}>{r.pending}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 3: PEOPLE AND CALLS */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                }}
              >
                <UsersIcon size={18} color="#d97706" />
              </span>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>People and calls</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Active agents</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{d.people.activeAgents}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Active team leaders</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{d.people.activeTeamLeaders}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Active outsource users</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{d.people.activeOutsourceUsers}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Average call</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{fmtSeconds(d.callLength.averageSeconds)}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Total call time</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{fmtSeconds(d.callLength.totalSeconds)}</div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
