import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CEO_RANGES } from '@shared/enums';
import { reportService } from '../../services/reports';
import { financeService } from '../../services/finance';
import { getUnifiedCases } from '../../services/caseSync';
import { errorMessage } from '../../services/api-client';
import { Loading, pageStyle } from '../../design-system';
import {
  ChartIcon,
  DocIcon,
  FinanceModule,
  OperationsModule,
} from './CeoModules';

const RANGE_LABEL: Record<string, string> = {
  TODAY: 'Today',
  THIS_WEEK: 'This week',
  THIS_MONTH: 'This month',
  PREVIOUS_MONTH: 'Previous month',
  YEAR_TO_DATE: 'Year to date',
  CUSTOM: 'Custom range',
};

export default function CeoDashboardPage() {
  const [range, setRange] = useState('THIS_MONTH');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [financeType, setFinanceType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'NET_POSITION'>('ALL');
  const [expenseHead, setExpenseHead] = useState('');
  const [operationsTab, setOperationsTab] = useState('OVERVIEW');

  const [appliedFilters, setAppliedFilters] = useState<{
    range: string;
    dateFrom: string;
    dateTo: string;
    financeType: 'ALL' | 'INCOME' | 'EXPENSE' | 'NET_POSITION';
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

  const casesQ = useQuery({
    queryKey: ['ceo-unified-cases'],
    queryFn: () => getUnifiedCases(),
    refetchInterval: 3000,
  });
  const allCases = casesQ.data || [];

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

  // Filter cases for the operational date range
  const filteredCases = useMemo(() => {
    const fromDate = appliedFilters.dateFrom || (d?.range.dateFrom ? d.range.dateFrom : '');
    const toDate = appliedFilters.dateTo || (d?.range.dateTo ? d.range.dateTo : '');

    return allCases.filter((c) => {
      const sub = (c.submittedAt || '').substring(0, 10);
      if (fromDate && sub < fromDate) return false;
      if (toDate && sub > toDate) return false;
      return true;
    });
  }, [allCases, appliedFilters.dateFrom, appliedFilters.dateTo, d?.range.dateFrom, d?.range.dateTo]);

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

  function handleHeadSelect(head: string) {
    setExpenseHead(head);
    setAppliedFilters((prev) => ({ ...prev, expenseHead: head }));
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
            <option value="NET_POSITION">Net position</option>
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
        <div style={{ display: 'grid', gap: 32 }}>
          {/* MODULE 1: FINANCE */}
          <FinanceModule
            finance={d.finance}
            trends={d.trends}
            financeType={appliedFilters.financeType}
            expenseHead={appliedFilters.expenseHead}
            totalHeadExpense={totalHeadExpense}
            headBreakdown={headBreakdown}
            filteredExpenses={filteredExpenses}
            onSelectHead={handleHeadSelect}
          />

          {/* MODULE 2: OPERATIONS */}
          <OperationsModule
            operations={d.operations}
            people={d.people}
            callLength={d.callLength}
            trends={d.trends}
            cases={filteredCases}
            activeTab={operationsTab}
            onTabChange={setOperationsTab}
          />
        </div>
      )}
    </main>
  );
}
