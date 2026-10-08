import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CEO_RANGES } from '@shared/enums';
import { reportService } from '../../services/reports';
import { financeService } from '../../services/finance';
import { getUnifiedCases } from '../../services/caseSync';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { Loading, pageStyle } from '../../design-system';
import {
  ExecutiveNavigation,
  ExecutiveOverview,
  FinanceModule,
  OperationsModule,
  AgentPerformanceModule,
  AuditComplianceModule,
  type CeoView,
} from './CeoModules';

const QUICK_RANGES = [
  { id: 'TODAY', label: 'Today' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'PREVIOUS_WEEK', label: 'Last Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'PREVIOUS_MONTH', label: 'Previous Month' },
  { id: 'YEAR_TO_DATE', label: 'Year to Date' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

export default function CeoDashboardPage() {
  const [activeView, setActiveView] = useState<CeoView>('OVERVIEW');
  const [viewMode, setViewMode] = useState<'SUMMARY' | 'DETAILED'>('SUMMARY');

  // Filter state
  const [range, setRange] = useState('THIS_MONTH');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [financeType, setFinanceType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'NET_POSITION'>('ALL');
  const [selectedHead, setSelectedHead] = useState('');
  const [caseStatus, setCaseStatus] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  // Applied filter state
  const [appliedFilters, setAppliedFilters] = useState({
    range: 'THIS_MONTH',
    dateFrom: '',
    dateTo: '',
    financeType: 'ALL' as 'ALL' | 'INCOME' | 'EXPENSE' | 'NET_POSITION',
    head: '',
    caseStatus: '',
    agent: '',
  });

  // 1. Expense Heads
  const expenseHeadsQ = useQuery({
    queryKey: ['expense-heads'],
    queryFn: () => financeService.heads(),
    refetchInterval: 5000,
  });
  const expenseHeads = expenseHeadsQ.data?.data || [];

  // 2. Income Heads
  const incomeHeadsQ = useQuery({
    queryKey: ['income-heads'],
    queryFn: () => financeService.incomeHeads(),
    refetchInterval: 5000,
  });
  const incomeHeads = incomeHeadsQ.data?.data || [];

  // 3. Transactions
  const expensesQ = useQuery({
    queryKey: ['ceo-expenses'],
    queryFn: () => financeService.list('expense', { pageSize: 150 }),
    refetchInterval: 5000,
  });
  const allExpenses = expensesQ.data?.rows || [];

  const incomesQ = useQuery({
    queryKey: ['ceo-incomes'],
    queryFn: () => financeService.list('income', { pageSize: 150 }),
    refetchInterval: 5000,
  });
  const allIncomes = incomesQ.data?.rows || [];

  // 4. Cases
  const casesQ = useQuery({
    queryKey: ['ceo-unified-cases'],
    queryFn: () => getUnifiedCases(),
    refetchInterval: 5000,
  });
  const allCases = casesQ.data || [];

  // 5. Audit logs
  const auditQ = useQuery({
    queryKey: ['ceo-audit-logs'],
    queryFn: () => adminService.audit({ pageSize: 50 }),
    enabled: activeView === 'AUDIT',
  });
  const allAuditLogs = auditQ.data?.data || [];

  const isCustom = appliedFilters.range === 'CUSTOM';
  const customReady = !isCustom || (!!appliedFilters.dateFrom && !!appliedFilters.dateTo);

  // 6. CEO Dashboard metrics query
  const q = useQuery({
    queryKey: ['ceo', appliedFilters.range, isCustom ? appliedFilters.dateFrom : '', isCustom ? appliedFilters.dateTo : ''],
    enabled: customReady,
    refetchInterval: 5000,
    queryFn: () =>
      reportService.ceoDashboard({
        range: appliedFilters.range,
        dateFrom: isCustom ? appliedFilters.dateFrom : undefined,
        dateTo: isCustom ? appliedFilters.dateTo : undefined,
      }),
  });

  const d = q.data?.data;

  // Filter financial data
  const { filteredExpenses, filteredIncomes, headBreakdown, totalHeadExpense } = useMemo(() => {
    const fromDate = appliedFilters.dateFrom || (d?.range.dateFrom ? d.range.dateFrom : '');
    const toDate = appliedFilters.dateTo || (d?.range.dateTo ? d.range.dateTo : '');

    // Incomes
    const activeIncomes = allIncomes.filter((i) => i.status !== 'VOIDED');
    const filteredInc = activeIncomes.filter((i) => {
      const iDate = i.fromDate || i.date;
      if (fromDate && iDate < fromDate) return false;
      if (toDate && iDate > toDate) return false;
      if (appliedFilters.head && i.category !== appliedFilters.head) return false;
      return true;
    });

    // Expenses
    const activeExpenses = allExpenses.filter((e) => e.status !== 'VOIDED');
    const inDateRangeExp = activeExpenses.filter((e) => {
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    });

    // Head breakdown for expenses
    const headMap = new Map<string, { headName: string; totalAmount: number; count: number }>();
    for (const h of expenseHeads) {
      headMap.set(h.name, { headName: h.name, totalAmount: 0, count: 0 });
    }
    let allDateExpensesSum = 0;
    for (const exp of inDateRangeExp) {
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

    let filteredExp = inDateRangeExp;
    if (appliedFilters.head) {
      filteredExp = filteredExp.filter((e) => e.category === appliedFilters.head);
    }

    const totalHead = appliedFilters.head
      ? headMap.get(appliedFilters.head)?.totalAmount || 0
      : undefined;

    return {
      filteredExpenses: filteredExp,
      filteredIncomes: filteredInc,
      headBreakdown: breakdown,
      totalHeadExpense: totalHead,
    };
  }, [allExpenses, allIncomes, expenseHeads, appliedFilters, d]);

  // Filter operational cases
  const filteredCases = useMemo(() => {
    const fromDate = appliedFilters.dateFrom || (d?.range.dateFrom ? d.range.dateFrom : '');
    const toDate = appliedFilters.dateTo || (d?.range.dateTo ? d.range.dateTo : '');

    return allCases.filter((c) => {
      const subDate = (c.submittedAt || '').substring(0, 10);
      if (fromDate && subDate < fromDate) return false;
      if (toDate && subDate > toDate) return false;
      if (appliedFilters.caseStatus && c.status !== appliedFilters.caseStatus) return false;
      if (appliedFilters.agent && c.agent?.fullName !== appliedFilters.agent) return false;
      return true;
    });
  }, [allCases, appliedFilters, d]);

  // Filter audit logs
  const filteredAuditLogs = useMemo(() => {
    const fromDate = appliedFilters.dateFrom;
    const toDate = appliedFilters.dateTo;
    return allAuditLogs.filter((l: any) => {
      const lDate = (l.at || '').substring(0, 10);
      if (fromDate && lDate < fromDate) return false;
      if (toDate && lDate > toDate) return false;
      return true;
    });
  }, [allAuditLogs, appliedFilters]);

  // Handlers
  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setAppliedFilters({
      range,
      dateFrom,
      dateTo,
      financeType,
      head: selectedHead,
      caseStatus,
      agent: selectedAgent,
    });
  }

  function handleClear() {
    setRange('THIS_MONTH');
    setDateFrom('');
    setDateTo('');
    setFinanceType('ALL');
    setSelectedHead('');
    setCaseStatus('');
    setSelectedAgent('');
    setAppliedFilters({
      range: 'THIS_MONTH',
      dateFrom: '',
      dateTo: '',
      financeType: 'ALL',
      head: '',
      caseStatus: '',
      agent: '',
    });
  }

  function handleQuickRange(rId: string) {
    setRange(rId);
    if (rId !== 'CUSTOM') {
      setDateFrom('');
      setDateTo('');
      setAppliedFilters((prev) => ({
        ...prev,
        range: rId,
        dateFrom: '',
        dateTo: '',
      }));
    }
  }

  // Extract distinct agents for filter dropdown
  const distinctAgents = useMemo(() => {
    const s = new Set<string>();
    for (const c of allCases) {
      if (c.agent?.fullName) s.add(c.agent.fullName);
    }
    return Array.from(s).sort();
  }, [allCases]);

  return (
    <main style={{ ...pageStyle, maxWidth: 1400, paddingBottom: 60 }}>
      {/* Executive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
            Executive CEO Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--secondary)' }}>
            Consolidated financial oversight, case pipelines, and workforce intelligence
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {d && (
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'var(--surface-muted, #f1f5f9)', color: 'var(--secondary)', fontWeight: 600 }}>
              Period: {d.range.dateFrom} → {d.range.dateTo}
            </span>
          )}
          {/* Summary vs Detailed Table View Toggle */}
          <div style={{ display: 'inline-flex', padding: 3, borderRadius: 8, background: 'var(--surface-muted, #f1f5f9)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setViewMode('SUMMARY')}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: viewMode === 'SUMMARY' ? 700 : 500,
                border: 'none',
                borderRadius: 6,
                background: viewMode === 'SUMMARY' ? '#ffffff' : 'transparent',
                color: viewMode === 'SUMMARY' ? '#461440' : 'var(--secondary)',
                boxShadow: viewMode === 'SUMMARY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              Summary View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DETAILED')}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: viewMode === 'DETAILED' ? 700 : 500,
                border: 'none',
                borderRadius: 6,
                background: viewMode === 'DETAILED' ? '#ffffff' : 'transparent',
                color: viewMode === 'DETAILED' ? '#461440' : 'var(--secondary)',
                boxShadow: viewMode === 'DETAILED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              Detailed Tables
            </button>
          </div>
        </div>
      </div>

      {/* Primary Executive Navigation View Selector */}
      <ExecutiveNavigation activeView={activeView} onSelectView={setActiveView} />

      {/* Granular & Context-Aware Filter Bar */}
      <form
        onSubmit={handleSearch}
        aria-label="Executive Filters"
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'grid',
          gap: 14,
        }}
      >
        {/* Quick Range Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary)', marginRight: 4 }}>Time Range:</span>
          {QUICK_RANGES.map((r) => {
            const isSelected = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleQuickRange(r.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '1px solid #461440' : '1px solid var(--border)',
                  background: isSelected ? '#461440' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--foreground)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Contextual Inputs Row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Custom Date Pickers (Shown if Custom Range is selected) */}
          {(range === 'CUSTOM' || dateFrom || dateTo) && (
            <>
              <label style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
                From Date
                <input
                  type="date"
                  className="input"
                  style={{ height: 38, width: 140, display: 'block', marginTop: 4 }}
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    if (range !== 'CUSTOM') setRange('CUSTOM');
                  }}
                />
              </label>

              <label style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
                To Date
                <input
                  type="date"
                  className="input"
                  style={{ height: 38, width: 140, display: 'block', marginTop: 4 }}
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    if (range !== 'CUSTOM') setRange('CUSTOM');
                  }}
                />
              </label>
            </>
          )}

          {/* FINANCE Module Filters */}
          {(activeView === 'FINANCE' || activeView === 'OVERVIEW') && (
            <>
              <label style={{ margin: 0, fontSize: 12, fontWeight: 600, minWidth: 160 }}>
                Financial Type
                <select
                  className="input"
                  style={{ height: 38, width: '100%', display: 'block', marginTop: 4 }}
                  value={financeType}
                  onChange={(e) => {
                    setFinanceType(e.target.value as any);
                    setSelectedHead('');
                  }}
                >
                  <option value="ALL">All Financial Types</option>
                  <option value="INCOME">Income Only</option>
                  <option value="EXPENSE">Expenses Only</option>
                  <option value="NET_POSITION">Net Position</option>
                </select>
              </label>

              <label style={{ margin: 0, fontSize: 12, fontWeight: 600, minWidth: 180 }}>
                {financeType === 'INCOME' ? 'Income Head' : financeType === 'EXPENSE' ? 'Expense Head' : 'Category / Head'}
                <select
                  className="input"
                  style={{ height: 38, width: '100%', display: 'block', marginTop: 4 }}
                  value={selectedHead}
                  onChange={(e) => setSelectedHead(e.target.value)}
                >
                  <option value="">All Categories / Heads</option>
                  {financeType === 'INCOME'
                    ? incomeHeads.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)
                    : financeType === 'EXPENSE'
                    ? expenseHeads.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)
                    : [
                        ...incomeHeads.map((h) => <option key={`inc_${h.id}`} value={h.name}>[Income] {h.name}</option>),
                        ...expenseHeads.map((h) => <option key={`exp_${h.id}`} value={h.name}>[Expense] {h.name}</option>),
                      ]}
                </select>
              </label>
            </>
          )}

          {/* OPERATIONS Module Filters */}
          {(activeView === 'OPERATIONS' || activeView === 'AGENTS') && (
            <>
              <label style={{ margin: 0, fontSize: 12, fontWeight: 600, minWidth: 140 }}>
                Case Status
                <select
                  className="input"
                  style={{ height: 38, width: '100%', display: 'block', marginTop: 4 }}
                  value={caseStatus}
                  onChange={(e) => setCaseStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>

              <label style={{ margin: 0, fontSize: 12, fontWeight: 600, minWidth: 160 }}>
                Intake Agent
                <select
                  className="input"
                  style={{ height: 38, width: '100%', display: 'block', marginTop: 4 }}
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                >
                  <option value="">All Agents</option>
                  {distinctAgents.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, height: 38, marginLeft: 'auto' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                height: 38,
                padding: '0 20px',
                borderRadius: 8,
                background: '#461440',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Apply Filters
            </button>
            <button
              type="button"
              className="btn"
              style={{ height: 38, padding: '0 16px', borderRadius: 8, cursor: 'pointer' }}
              onClick={handleClear}
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* Loading & Error States */}
      {q.isLoading && customReady && <Loading />}
      {q.isError && <p className="err" role="alert">{errorMessage(q.error)}</p>}

      {/* STRICT CONDITIONAL RENDERING - Unmounts Unrelated Modules Completely */}
      {d && (
        <div style={{ minHeight: 400 }}>
          {/* VIEW 1: EXECUTIVE OVERVIEW (Default Landing View) */}
          {activeView === 'OVERVIEW' && (
            <ExecutiveOverview dashboard={d} onNavigate={setActiveView} />
          )}

          {/* VIEW 2: FINANCE & FINANCIAL REPORTS */}
          {activeView === 'FINANCE' && (
            <FinanceModule
              finance={d.finance}
              trends={d.trends}
              financeType={appliedFilters.financeType}
              expenseHead={appliedFilters.head}
              totalHeadExpense={totalHeadExpense}
              headBreakdown={headBreakdown}
              filteredExpenses={filteredExpenses}
              filteredIncomes={filteredIncomes}
              viewMode={viewMode}
              onSelectHead={(h) => {
                setSelectedHead(h);
                setAppliedFilters((prev) => ({ ...prev, head: h }));
              }}
            />
          )}

          {/* VIEW 3: OPERATIONS & CASES REPORTS */}
          {activeView === 'OPERATIONS' && (
            <OperationsModule
              operations={d.operations}
              trends={d.trends}
              cases={filteredCases}
              statusFilter={appliedFilters.caseStatus}
              agentFilter={appliedFilters.agent}
            />
          )}

          {/* VIEW 4: AGENT & TEAM PERFORMANCE */}
          {activeView === 'AGENTS' && (
            <AgentPerformanceModule
              cases={filteredCases}
              callLength={d.callLength}
            />
          )}

          {/* VIEW 5: AUDIT & COMPLIANCE LOGS */}
          {activeView === 'AUDIT' && (
            <AuditComplianceModule
              logs={filteredAuditLogs}
            />
          )}
        </div>
      )}
    </main>
  );
}
