import React from 'react';
import { Link } from 'react-router-dom';
import { fmtSeconds, fmtDateTime } from '../../lib/format';
import type { CeoDashboardDto } from '../../schemas/domain';
import type { TxRow } from '../../services/finance';
import type { CaseDto } from '../../schemas';

// --- Executive SVG Icons ---
export const ChartIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const CoinsIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="7" rx="9" ry="3" />
    <path d="M3 7v6c0 1.66 4.03 3 9 3s9-1.34 9-3V7" />
    <path d="M3 13v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
  </svg>
);

export const GearIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const UsersIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ShieldIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const DocIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

export const CheckIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CrossIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ClockIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export interface HeadBreakdownItem {
  headName: string;
  totalAmount: number;
  count: number;
  share: number;
}

// --- 1. Primary Executive Navigation Tabs ---
export type CeoView = 'OVERVIEW' | 'FINANCE' | 'OPERATIONS' | 'AGENTS' | 'AUDIT';

export function ExecutiveNavigation({
  activeView,
  onSelectView,
}: {
  activeView: CeoView;
  onSelectView: (v: CeoView) => void;
}) {
  const views: Array<{ id: CeoView; label: string; icon: React.ReactNode; desc: string }> = [
    { id: 'OVERVIEW', label: 'Executive Summary', icon: <ChartIcon size={18} />, desc: 'High-level KPIs & performance trends' },
    { id: 'FINANCE', label: 'Finance & Ledger', icon: <CoinsIcon size={18} />, desc: 'Income, expenses & cash flow' },
    { id: 'OPERATIONS', label: 'Operations & Cases', icon: <GearIcon size={18} />, desc: 'Intake, status & case pipeline' },
    { id: 'AGENTS', label: 'Agent & Team Metrics', icon: <UsersIcon size={18} />, desc: 'Productivity & call analytics' },
    { id: 'AUDIT', label: 'Audit & Compliance', icon: <ShieldIcon size={18} />, desc: 'System events & activity trail' },
  ];

  return (
    <nav
      aria-label="Executive Navigation"
      style={{
        display: 'flex',
        gap: 8,
        background: 'var(--card-bg, #ffffff)',
        padding: '6px 8px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        marginBottom: 20,
        overflowX: 'auto',
      }}
    >
      {views.map((v) => {
        const isActive = activeView === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelectView(v.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: isActive ? '#461440' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--foreground)',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: isActive ? '0 4px 12px rgba(70, 20, 64, 0.25)' : 'none',
            }}
          >
            <span style={{ color: isActive ? '#ffffff' : 'var(--primary, #461440)' }}>{v.icon}</span>
            <span>{v.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// --- 2. Executive Overview (Clutter-Free Landing View) ---
export function ExecutiveOverview({
  dashboard,
  onNavigate,
}: {
  dashboard: any;
  onNavigate: (v: CeoView) => void;
}) {
  const f = dashboard.finance;
  const ops = dashboard.operations;
  const p = dashboard.people;
  const cl = dashboard.callLength;

  const netNum = f ? parseFloat(f.netPosition) || 0 : 0;
  const isNetPositive = netNum >= 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* High-Level Executive Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Income Card */}
        <div
          className="card"
          style={{
            padding: '22px 24px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--card-bg, #ffffff)',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('FINANCE')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)' }}>Total Revenue / Income</span>
            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' }}>
              + Active
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', marginTop: 10 }}>
            {f ? f.totalIncome : '0'} {f?.currency || 'PKR'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            <span>Monthly cash inflows</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Ledger details →</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div
          className="card"
          style={{
            padding: '22px 24px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--card-bg, #ffffff)',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('FINANCE')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)' }}>Total Operating Expenses</span>
            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              Outflow
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', marginTop: 10 }}>
            {f ? f.totalExpenses : '0'} {f?.currency || 'PKR'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            <span>Verified head expenditures</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Head breakdown →</span>
          </div>
        </div>

        {/* Net Profit / Position Card */}
        <div
          className="card"
          style={{
            padding: '22px 24px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--card-bg, #ffffff)',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('FINANCE')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)' }}>Net Profit / Position</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: isNetPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isNetPositive ? '#16a34a' : '#ef4444',
              }}
            >
              {isNetPositive ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: isNetPositive ? '#16a34a' : '#ef4444', marginTop: 10 }}>
            {f ? f.netPosition : '0'} {f?.currency || 'PKR'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            <span>Net cash balance</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Financial reports →</span>
          </div>
        </div>

        {/* Case Intake & Resolution Card */}
        <div
          className="card"
          style={{
            padding: '22px 24px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--card-bg, #ffffff)',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('OPERATIONS')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)' }}>Total Case Pipeline</span>
            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(14, 165, 233, 0.15)', color: '#0284c7' }}>
              {ops.acceptanceRate}% Rate
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--foreground)', marginTop: 10 }}>
            {ops.totalRecords.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--secondary)' }}>cases</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            <span>{ops.accepted} accepted • {ops.pending} pending</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Case reports →</span>
          </div>
        </div>
      </div>

      {/* Monthly Financial Trend & Operational Health Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Monthly Performance Trend */}
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--card-bg, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Monthly Financial Trend</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary)' }}>
                Comparison of monthly revenue vs expenditures
              </p>
            </div>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onNavigate('FINANCE')}>
              View Ledger →
            </button>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {dashboard.trends.incomeVsExpenseByMonth.slice(0, 4).map((row: any) => {
              const inc = parseFloat(row.income) || 0;
              const exp = parseFloat(row.expenses) || 0;
              const max = Math.max(inc, exp, 1);
              const incPct = Math.min(100, Math.round((inc / max) * 100));
              const expPct = Math.min(100, Math.round((exp / max) * 100));

              return (
                <div key={row.month} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-muted, #f8fafc)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    <span>{row.month}</span>
                    <span>
                      <strong style={{ color: '#16a34a' }}>+{inc.toLocaleString()}</strong> /{' '}
                      <strong style={{ color: '#ef4444' }}>-{exp.toLocaleString()}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${incPct}%`, height: '100%', background: '#22c55e', borderRadius: 3 }} />
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${expPct}%`, height: '100%', background: '#ef4444', borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational & Workforce Snapshot */}
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--card-bg, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Workforce & Operations Snapshot</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary)' }}>
                Active human capital and case intake metrics
              </p>
            </div>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onNavigate('AGENTS')}>
              Team Analytics →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-muted, #f8fafc)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--secondary)', fontWeight: 600 }}>Active Agents</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{p.activeAgents}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Handling intake calls</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-muted, #f8fafc)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--secondary)', fontWeight: 600 }}>Team Leaders</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{p.activeTeamLeaders}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Supervising & reviewing</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-muted, #f8fafc)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--secondary)', fontWeight: 600 }}>Avg Call Duration</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{fmtSeconds(cl.averageSeconds)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Total: {fmtSeconds(cl.totalSeconds)}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-muted, #f8fafc)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--secondary)', fontWeight: 600 }}>Outsource Partners</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{p.activeOutsourceUsers}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Active verification</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 3. Finance & Financial Reports Module ---
export function FinanceModule({
  finance,
  trends,
  financeType,
  expenseHead,
  totalHeadExpense,
  headBreakdown,
  filteredExpenses,
  filteredIncomes,
  viewMode,
  onSelectHead,
}: {
  finance: any;
  trends: any;
  financeType: 'ALL' | 'INCOME' | 'EXPENSE' | 'NET_POSITION';
  expenseHead?: string;
  totalHeadExpense?: number;
  headBreakdown: HeadBreakdownItem[];
  filteredExpenses: TxRow[];
  filteredIncomes: TxRow[];
  viewMode: 'SUMMARY' | 'DETAILED';
  onSelectHead: (h: string) => void;
}) {
  const isIncomeOnly = financeType === 'INCOME';
  const isExpenseOnly = financeType === 'EXPENSE';
  const isNetOnly = financeType === 'NET_POSITION';
  const isAll = financeType === 'ALL';

  const totalFilteredIncome = filteredIncomes
    .filter((i) => i.status !== 'VOIDED')
    .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const totalFilteredExpense = filteredExpenses
    .filter((e) => e.status !== 'VOIDED')
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Financial KPIs (Filtered dynamically) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Income Card - Shown when ALL or INCOME */}
        {(isAll || isIncomeOnly) && (
          <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)' }}>Total Income / Revenue</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' }}>
                PKR
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
              {isIncomeOnly
                ? totalFilteredIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })
                : finance?.totalIncome || '0'} PKR
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {filteredIncomes.length} recorded income entries
            </div>
          </div>
        )}

        {/* Expenses Card - Shown when ALL or EXPENSE */}
        {(isAll || isExpenseOnly) && (
          <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)' }}>Total Operating Expenses</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                PKR
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#ef4444', marginTop: 8 }}>
              {expenseHead && totalHeadExpense !== undefined
                ? totalHeadExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })
                : isExpenseOnly
                ? totalFilteredExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })
                : finance?.totalExpenses || '0'} PKR
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {filteredExpenses.length} verified expense entries
            </div>
          </div>
        )}

        {/* Net Position Card - Shown when ALL or NET_POSITION */}
        {(isAll || isNetOnly) && (
          <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)' }}>Net Position (Balance)</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(14, 165, 233, 0.15)', color: '#0284c7' }}>
                PKR
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', marginTop: 8 }}>
              {finance?.netPosition || '0'} PKR
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              Income minus verified expenses
            </div>
          </div>
        )}
      </div>

      {/* Expense Head Distribution (Strictly hidden when Income Only is active) */}
      {!isIncomeOnly && headBreakdown.length > 0 && (
        <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Expense Allocation by Category Head</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary)' }}>
                Click any head category to isolate expenditures
              </p>
            </div>
            {expenseHead && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onSelectHead('')}>
                Clear Head Selection
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {headBreakdown.map((h) => {
              const isSelected = expenseHead === h.headName;
              return (
                <div
                  key={h.headName}
                  onClick={() => onSelectHead(isSelected ? '' : h.headName)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${isSelected ? '#461440' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(70, 20, 64, 0.08)' : 'var(--surface-muted, #f8fafc)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: isSelected ? '#461440' : 'var(--foreground)' }}>{h.headName}</span>
                    <span style={{ color: 'var(--secondary)', fontSize: 12 }}>{h.share}%</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', marginTop: 6 }}>
                    {h.totalAmount.toLocaleString()} PKR
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, h.share)}%`, height: '100%', background: '#ef4444', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income Records Table (Strictly shown when ALL or INCOME) */}
      {(isAll || isIncomeOnly) && (
        <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Income Transaction Ledger</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary)' }}>
                {filteredIncomes.length} records matching current date filters
              </p>
            </div>
            <Link to="/finance/income" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>
              Full Income Module →
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Income Head</th>
                  <th scope="col">Duration / Date</th>
                  <th scope="col">Remarks</th>
                  <th scope="col">Amount (PKR)</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No income records match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredIncomes.slice(0, 15).map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.category}</strong></td>
                      <td>{row.fromDate && row.toDate ? `${row.fromDate} – ${row.toDate}` : row.date}</td>
                      <td>{row.description || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>{row.amount} PKR</td>
                      <td>
                        <span className={row.status === 'ACTIVE' ? 'badge b-ACTIVE' : 'badge'}>
                          {row.status === 'ACTIVE' ? 'Active' : 'Voided'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Records Table (Strictly shown when ALL or EXPENSE) */}
      {(isAll || isExpenseOnly) && (
        <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Expense Transaction Ledger</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary)' }}>
                {filteredExpenses.length} records matching current filters
              </p>
            </div>
            <Link to="/finance/expenses" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>
              Full Expense Module →
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Expense Head</th>
                  <th scope="col">Date</th>
                  <th scope="col">Payee / Remarks</th>
                  <th scope="col">Amount (PKR)</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No expense records match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.slice(0, 15).map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.category}</strong></td>
                      <td>{row.date}</td>
                      <td>{row.description || row.party || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#ef4444' }}>{row.amount} {row.currency}</td>
                      <td>
                        <span className={row.status === 'ACTIVE' ? 'badge b-ACTIVE' : 'badge'}>
                          {row.status === 'ACTIVE' ? 'Active' : 'Voided'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 4. Operations & Cases Reports Module ---
export function OperationsModule({
  operations,
  trends,
  cases,
  statusFilter,
  agentFilter,
}: {
  operations: any;
  trends: any;
  cases: CaseDto[];
  statusFilter: string;
  agentFilter: string;
}) {
  const total = cases.length;
  const pending = cases.filter((c) => c.status === 'PENDING').length;
  const accepted = cases.filter((c) => c.status === 'ACCEPTED').length;
  const rejected = cases.filter((c) => c.status === 'REJECTED').length;
  const processed = accepted + rejected;

  const acceptanceRate = processed > 0 ? Math.round((accepted / processed) * 100) : 0;
  const rejectionRate = processed > 0 ? Math.round((rejected / processed) * 100) : 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Dynamic Case Pipeline KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary)' }}>Total Filtered Cases</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{total}</div>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706' }}>Pending Cases</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706', marginTop: 4 }}>{pending}</div>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Accepted Cases</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{accepted}</div>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Rejected Cases</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{rejected}</div>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0284c7' }}>Acceptance Rate</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>{acceptanceRate}%</div>
        </div>
      </div>

      {/* Case Pipeline Table */}
      <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Case Processing Records</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary)' }}>
              Showing {cases.length} records matching current filter criteria
            </p>
          </div>
          <Link to="/reports" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>
            Open Advanced Reports →
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Case ID</th>
                <th scope="col">Customer Name</th>
                <th scope="col">Phone</th>
                <th scope="col">State / ZIP</th>
                <th scope="col">Assigned Agent</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                    No case records match these filters.
                  </td>
                </tr>
              ) : (
                cases.slice(0, 20).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/cases/${c.id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--primary)' }}>
                        {c.id.substring(0, 8)}…
                      </Link>
                    </td>
                    <td>{c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : '—'}</td>
                    <td>{c.customer?.phone || '—'}</td>
                    <td>{c.customer?.address || c.customer?.zipCode ? `${c.customer.address || ''} ${c.customer.zipCode || ''}` : '—'}</td>
                    <td>{c.agent?.fullName || 'Unassigned'}</td>
                    <td>
                      <span className={`badge b-${c.status}`}>{c.status}</span>
                    </td>
                    <td>{c.submittedAt ? c.submittedAt.substring(0, 10) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- 5. Agent & Team Performance Module ---
export function AgentPerformanceModule({
  cases,
  callLength,
}: {
  cases: CaseDto[];
  callLength: any;
}) {
  // Aggregate performance by agent
  const agentMap = new Map<string, { agentName: string; total: number; accepted: number; rejected: number; pending: number }>();

  for (const c of cases) {
    const aName = c.agent?.fullName || 'Unassigned';
    const curr = agentMap.get(aName) || { agentName: aName, total: 0, accepted: 0, rejected: 0, pending: 0 };
    curr.total += 1;
    if (c.status === 'ACCEPTED') curr.accepted += 1;
    else if (c.status === 'REJECTED') curr.rejected += 1;
    else curr.pending += 1;
    agentMap.set(aName, curr);
  }

  const agents = Array.from(agentMap.values()).sort((a, b) => b.total - a.total);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Call Duration Analytics KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary)' }}>Average Call Duration</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{fmtSeconds(callLength.averageSeconds)}</div>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary)' }}>Total Talk Time</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{fmtSeconds(callLength.totalSeconds)}</div>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary)' }}>Shortest Call</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{fmtSeconds(callLength.minSeconds)}</div>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary)' }}>Longest Call</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{fmtSeconds(callLength.maxSeconds)}</div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Agent Productivity & Acceptance Metrics</h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Agent Name</th>
                <th scope="col">Total Cases</th>
                <th scope="col">Accepted</th>
                <th scope="col">Rejected</th>
                <th scope="col">Pending</th>
                <th scope="col">Acceptance Rate</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                    No agent performance records available.
                  </td>
                </tr>
              ) : (
                agents.map((a) => {
                  const processed = a.accepted + a.rejected;
                  const rate = processed > 0 ? Math.round((a.accepted / processed) * 100) : 0;
                  return (
                    <tr key={a.agentName}>
                      <td><strong>{a.agentName}</strong></td>
                      <td style={{ fontWeight: 600 }}>{a.total}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{a.accepted}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{a.rejected}</td>
                      <td style={{ color: '#d97706' }}>{a.pending}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: rate >= 70 ? '#16a34a' : 'var(--foreground)' }}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- 6. Audit & Compliance Module ---
export function AuditComplianceModule({
  logs,
}: {
  logs: any[];
}) {
  return (
    <div className="card" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Security & Compliance Audit Trail</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary)' }}>
            Real-time chronological log of system transactions and administrative modifications
          </p>
        </div>
        <Link to="/admin/audit" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>
          Open Full Audit Page →
        </Link>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Timestamp</th>
              <th scope="col">Event</th>
              <th scope="col">Actor</th>
              <th scope="col">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                  No audit log entries recorded for this timeframe.
                </td>
              </tr>
            ) : (
              logs.slice(0, 20).map((l: any) => (
                <tr key={l.id}>
                  <td>{fmtDateTime(l.at)}</td>
                  <td><span className="badge">{l.event}</span></td>
                  <td>{l.actor?.fullName || 'System Staff'}</td>
                  <td><code>{l.entityType}:{l.entityId?.substring(0, 8)}</code></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
