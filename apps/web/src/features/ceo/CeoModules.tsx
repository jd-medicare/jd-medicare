import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fmtSeconds } from '../../lib/format';
import type { CeoDashboardDto } from '../../schemas/domain';
import type { TxRow } from '../../services/finance';
import type { CaseDto } from '../../schemas';

// SVG Icons
export const ChartIcon = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

export const CalendarIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
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

export const DocIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

export const ClockIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
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

export const RefreshIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export interface HeadBreakdownItem {
  headName: string;
  totalAmount: number;
  count: number;
  share: number;
}

// ModuleTabs Component
export function ModuleTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Array<{ id: string; label: string; icon?: React.ReactNode }>;
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--border)',
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: 2,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--primary, #461440)' : 'var(--muted, #64748b)',
              background: isActive ? 'rgba(70, 20, 64, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: isActive ? '3px solid var(--primary, #461440)' : '3px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// FinancialSummary KPI Cards
export function FinancialSummary({
  finance,
  financeType,
  expenseHead,
  totalHeadExpense,
}: {
  finance: any;
  financeType: 'ALL' | 'INCOME' | 'EXPENSE' | 'NET_POSITION';
  expenseHead?: string;
  totalHeadExpense?: number;
}) {
  const showIncome = financeType === 'ALL' || financeType === 'INCOME';
  const showExpenses = financeType === 'ALL' || financeType === 'EXPENSE';
  const showNet = financeType === 'ALL' || financeType === 'NET_POSITION';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 18 }}>
      {/* Income Card */}
      {showIncome && (
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
              {finance.totalIncome} {finance.currency} <span style={{ fontSize: 18 }}>↓</span>
            </div>
          </div>
          <svg width="70" height="35" viewBox="0 0 70 35" fill="none">
            <path d="M2 30L20 22L38 25L52 10L68 6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Expenses Card */}
      {showExpenses && (
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
              {expenseHead && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#461440', color: '#fff', fontWeight: 600 }}>
                  {expenseHead}
                </span>
              )}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 8 }}>
              {expenseHead && totalHeadExpense !== undefined
                ? `${totalHeadExpense.toLocaleString()} ${finance.currency}`
                : `${finance.totalExpenses} ${finance.currency}`} <span style={{ fontSize: 18 }}>↑</span>
            </div>
          </div>
          <svg width="70" height="35" viewBox="0 0 70 35" fill="none">
            <path d="M2 18L18 26L34 14L50 22L68 6" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Net Position Card */}
      {showNet && (
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
              {finance.netPosition} {finance.currency} <span style={{ fontSize: 18 }}>↑</span>
            </div>
          </div>
          <svg width="70" height="35" viewBox="0 0 70 35" fill="none">
            <path d="M2 28L22 20L40 22L54 12L68 4" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ExpenseBreakdown Component
export function ExpenseBreakdown({
  headBreakdown,
  filteredExpenses,
  selectedHead,
  onSelectHead,
}: {
  headBreakdown: HeadBreakdownItem[];
  filteredExpenses: TxRow[];
  selectedHead?: string;
  onSelectHead: (head: string) => void;
}) {
  return (
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
              {selectedHead ? `Filtered for ${selectedHead}` : 'Expenditure metrics grouped by expense head'}
            </p>
          </div>
        </div>
        {selectedHead && (
          <button
            type="button"
            className="btn"
            style={{ fontSize: 12, padding: '4px 10px', height: 28 }}
            onClick={() => onSelectHead('')}
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
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)', padding: 16 }}>
                  No expense records found.
                </td>
              </tr>
            ) : (
              headBreakdown.map((hb) => {
                const isSelected = selectedHead === hb.headName;
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
                        onClick={() => onSelectHead(isSelected ? '' : hb.headName)}
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

      {filteredExpenses.length > 0 && (
        <div style={{ marginTop: 22, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: 'var(--muted, #64748b)' }}>
            Expense entries {selectedHead ? `(${selectedHead})` : ''}
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
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: exp.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: exp.status === 'ACTIVE' ? '#16a34a' : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
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
  );
}

// FinanceModule Component
export function FinanceModule({
  finance,
  trends,
  financeType,
  expenseHead,
  totalHeadExpense,
  headBreakdown,
  filteredExpenses,
  onSelectHead,
}: {
  finance: any;
  trends: any;
  financeType: 'ALL' | 'INCOME' | 'EXPENSE' | 'NET_POSITION';
  expenseHead?: string;
  totalHeadExpense?: number;
  headBreakdown: HeadBreakdownItem[];
  filteredExpenses: TxRow[];
  onSelectHead: (head: string) => void;
}) {
  const showExpensesBreakdown = financeType === 'ALL' || financeType === 'EXPENSE';
  const showMonthlyTable = financeType === 'ALL' || financeType === 'INCOME' || financeType === 'NET_POSITION';

  return (
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

      {finance ? (
        <>
          <FinancialSummary
            finance={finance}
            financeType={financeType}
            expenseHead={expenseHead}
            totalHeadExpense={totalHeadExpense}
          />

          {showMonthlyTable && (
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
                    {trends.incomeVsExpenseByMonth.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)', padding: 16 }}>
                          No financial records in this period.
                        </td>
                      </tr>
                    ) : (
                      trends.incomeVsExpenseByMonth.map((r: any) => (
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
          )}

          {showExpensesBreakdown && (
            <ExpenseBreakdown
              headBreakdown={headBreakdown}
              filteredExpenses={filteredExpenses}
              selectedHead={expenseHead}
              onSelectHead={onSelectHead}
            />
          )}
        </>
      ) : (
        <p className="card" role="note">Finance figures are not available for your account.</p>
      )}
    </section>
  );
}

// CaseStatusBreakdown Component
export function CaseStatusBreakdown({ operations }: { operations: any }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
      <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Total cases</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{operations.totalRecords}</div>
      </div>
      <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.04)' }}>
        <div style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>Pending</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#d97706' }}>{operations.pending}</div>
      </div>
      <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.04)' }}>
        <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>Accepted</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#16a34a' }}>{operations.accepted}</div>
      </div>
      <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.04)' }}>
        <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Rejected</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>{operations.rejected}</div>
      </div>
      <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Acceptance rate</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#16a34a' }}>{operations.acceptanceRate}%</div>
      </div>
      <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Rejection rate</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>{operations.rejectionRate}%</div>
      </div>
    </div>
  );
}

// DailyCaseBreakdown Component
export function DailyCaseBreakdown({ recordsByDate }: { recordsByDate: any[] }) {
  return (
    <div className="card" style={{ padding: '18px 22px', borderRadius: 14, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
          <CalendarIcon size={16} color="#d97706" />
        </span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Daily case breakdown</h3>
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
            {recordsByDate.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)', padding: 16 }}>
                  No cases recorded in this date range.
                </td>
              </tr>
            ) : (
              recordsByDate.map((r: any) => (
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
  );
}

// AgentPerformance Component
export function AgentPerformance({ cases }: { cases: CaseDto[] }) {
  const agentMap = useMemo(() => {
    const map: Record<string, { name: string; total: number; accepted: number; rejected: number; pending: number; callSeconds: number }> = {};
    for (const c of cases) {
      const name = c.agent?.fullName || 'Intake Agent';
      if (!map[name]) {
        map[name] = { name, total: 0, accepted: 0, rejected: 0, pending: 0, callSeconds: 0 };
      }
      map[name].total += 1;
      if (c.status === 'ACCEPTED') map[name].accepted += 1;
      else if (c.status === 'REJECTED') map[name].rejected += 1;
      else map[name].pending += 1;
      map[name].callSeconds += c.callLengthSeconds || 0;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [cases]);

  return (
    <div className="card" style={{ padding: '18px 22px', borderRadius: 14, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
          <UsersIcon size={16} color="#d97706" />
        </span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Agent performance</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">AGENT</th>
              <th scope="col">TOTAL</th>
              <th scope="col">ACCEPTED</th>
              <th scope="col">REJECTED</th>
              <th scope="col">PENDING</th>
              <th scope="col">AVG CALL</th>
            </tr>
          </thead>
          <tbody>
            {agentMap.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)', padding: 16 }}>
                  No agent performance data found.
                </td>
              </tr>
            ) : (
              agentMap.map((a) => (
                <tr key={a.name}>
                  <td><strong>{a.name}</strong></td>
                  <td>{a.total}</td>
                  <td style={{ color: '#16a34a', fontWeight: 600 }}>{a.accepted}</td>
                  <td style={{ color: '#ef4444', fontWeight: 600 }}>{a.rejected}</td>
                  <td style={{ color: '#ea580c', fontWeight: 600 }}>{a.pending}</td>
                  <td>{a.total > 0 ? fmtSeconds(Math.round(a.callSeconds / a.total)) : '00:00:00'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// OperationsModule Component
export function OperationsModule({
  operations,
  people,
  callLength,
  trends,
  cases = [],
  activeTab = 'OVERVIEW',
  onTabChange,
}: {
  operations: any;
  people: any;
  callLength: any;
  trends: any;
  cases?: CaseDto[];
  activeTab?: string;
  onTabChange: (tabId: string) => void;
}) {
  const tabs = [
    { id: 'OVERVIEW', label: 'Overview / Summary', icon: <DocIcon size={14} /> },
    { id: 'AGENT_PERFORMANCE', label: 'Agent Performance', icon: <UsersIcon size={14} /> },
    { id: 'CASE_STATUS', label: 'Case Status Breakdown', icon: <CheckIcon size={14} /> },
    { id: 'DAILY_BREAKDOWN', label: 'Daily / Date Breakdown', icon: <CalendarIcon size={14} /> },
  ];

  return (
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

      <ModuleTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab === 'OVERVIEW' && (
        <>
          {/* Operations KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DocIcon size={13} color="#6366f1" />
                </span>
                Total records
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{operations.totalRecords}</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UsersIcon size={13} color="#d97706" />
                </span>
                New records
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{operations.newRecords}</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClockIcon size={13} color="#ea580c" />
                </span>
                Pending
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{operations.pending}</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon size={13} color="#16a34a" />
                </span>
                Accepted
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#16a34a' }}>{operations.accepted}</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CrossIcon size={13} color="#ef4444" />
                </span>
                Rejected
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>{operations.rejected}</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(20, 184, 166, 0.15)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshIcon size={13} color="#0d9488" />
                </span>
                Processed
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{operations.processingRate}%</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon size={13} color="#16a34a" />
                </span>
                Acceptance
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#16a34a' }}>{operations.acceptanceRate}%</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CrossIcon size={13} color="#ef4444" />
                </span>
                Rejection
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>{operations.rejectionRate}%</div>
            </div>
          </div>

          <DailyCaseBreakdown recordsByDate={trends.recordsByDate} />

          {/* People & Calls */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <UsersIcon size={16} color="#d97706" />
              </span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>People and calls</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Active agents</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{people.activeAgents}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Active team leaders</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{people.activeTeamLeaders}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Active outsource users</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{people.activeOutsourceUsers}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Average call</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{fmtSeconds(callLength.averageSeconds)}</div>
              </div>
              <div className="card" style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Total call time</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{fmtSeconds(callLength.totalSeconds)}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'AGENT_PERFORMANCE' && <AgentPerformance cases={cases} />}

      {activeTab === 'CASE_STATUS' && <CaseStatusBreakdown operations={operations} />}

      {activeTab === 'DAILY_BREAKDOWN' && <DailyCaseBreakdown recordsByDate={trends.recordsByDate} />}
    </section>
  );
}
