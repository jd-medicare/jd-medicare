import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { caseService } from '../../services/cases';
import { adminService } from '../../services/admin';
import { pageStyle } from '../../design-system';
import type { SessionUserDto } from '../../schemas';
import { AdminView, CeoCasesView, OutsourceView, TeamLeaderView } from './ReportViews';
import ExportPanel from './ExportPanel';

const LABEL: Record<string, string> = {
  CEO_CASES: 'Cases breakdown (Pending, Accepted, Rejected)',
  OUTSOURCE: 'Outsource summary',
  TEAM_LEADER: 'Team performance',
  ADMIN: 'Administration',
};

// Which reports to offer by role. UI convenience only; the API enforces report access.
const BY_ROLE: Record<string, string[]> = {
  OUTSOURCE: ['OUTSOURCE'],
  TEAM_LEADER: ['TEAM_LEADER'],
  ADMIN: ['CEO_CASES', 'ADMIN'],
  CEO: ['CEO_CASES', 'OUTSOURCE', 'TEAM_LEADER', 'ADMIN'],
  PRIMARY_SUPER_ADMIN: ['CEO_CASES', 'OUTSOURCE', 'TEAM_LEADER', 'ADMIN'],
};

export default function ReportsPage({ user }: { user: SessionUserDto }) {
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'ADMIN' || user.permissions.includes('*'));
  const types = isSuper ? ['CEO_CASES', 'OUTSOURCE', 'TEAM_LEADER', 'ADMIN'] : BY_ROLE[user.roleKey] ?? [];

  const [typeInput, setTypeInput] = useState(types[0] ?? 'CEO_CASES');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const casesQuery = useQuery({ queryKey: ['cases-for-reports'], queryFn: () => caseService.list({ page: 1, pageSize: 100 }) });
  const usersQuery = useQuery({
    queryKey: ['users-for-reports'],
    queryFn: () => adminService.users({ page: 1, pageSize: 100 }).catch(() => null),
  });

  const availableAgents: Array<{ id: string; name: string }> = [];
  const seenAgents = new Set<string>();

  // Add from users list
  for (const u of usersQuery.data?.data ?? []) {
    const name = u.fullName || '';
    if (name && !seenAgents.has(name.toLowerCase())) {
      seenAgents.add(name.toLowerCase());
      availableAgents.push({ id: u.id, name });
    }
  }

  // Add from cases list
  for (const c of casesQuery.data?.data ?? []) {
    const id = c.agent?.id || c.agent?.fullName || '';
    const name = c.agent?.fullName || '';
    if (name && !seenAgents.has(name.toLowerCase())) {
      seenAgents.add(name.toLowerCase());
      availableAgents.push({ id, name });
    }
  }

  availableAgents.sort((a, b) => a.name.localeCompare(b.name));

  // Applied filters on Search click
  const [applied, setApplied] = useState<{
    type: string;
    dateFrom: string;
    dateTo: string;
    user: string;
    status: string;
    search: string;
  }>({
    type: types[0] ?? 'CEO_CASES',
    dateFrom: '',
    dateTo: '',
    user: '',
    status: '',
    search: '',
  });

  const filters: Record<string, string> = {};
  if (applied.dateFrom) filters.dateFrom = applied.dateFrom;
  if (applied.dateTo) filters.dateTo = applied.dateTo;
  if (applied.user) filters.user = applied.user;
  if (applied.status) filters.status = applied.status;
  if (applied.search) filters.search = applied.search;

  const badRange = !!applied.dateFrom && !!applied.dateTo && applied.dateFrom > applied.dateTo;

  function handleSearch(e?: FormEvent) {
    if (e) e.preventDefault();
    setApplied({
      type: typeInput,
      dateFrom: dateFromInput,
      dateTo: dateToInput,
      user: userInput.trim(),
      status: statusInput.trim(),
      search: searchInput.trim(),
    });
  }

  function handleClear() {
    setDateFromInput('');
    setDateToInput('');
    setUserInput('');
    setStatusInput('');
    setSearchInput('');
    setApplied({
      type: typeInput,
      dateFrom: '',
      dateTo: '',
      user: '',
      status: '',
      search: '',
    });
  }

  return (
    <main style={pageStyle}>
      <h1 style={{ margin: 0 }}>Reports</h1>

      {types.length === 0 ? (
        <p role="alert">No reports are available for your role.</p>
      ) : (
        <>
          <form
            role="search"
            aria-label="Report filters"
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              padding: '16px 20px',
              background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
              borderRadius: 10,
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
              marginTop: 12,
              marginBottom: 16,
            }}
          >
            {types.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180, flex: '1 1 180px' }}>
                <label htmlFor="report-type" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
                  Report
                </label>
                <select
                  id="report-type"
                  className="input"
                  style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                  value={typeInput}
                  onChange={(e) => {
                    setTypeInput(e.target.value);
                    setApplied((prev) => ({ ...prev, type: e.target.value }));
                  }}
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, flex: '1 1 150px' }}>
              <label htmlFor="report-from" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
                From
              </label>
              <input
                id="report-from"
                className="input"
                type="date"
                style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                value={dateFromInput}
                onChange={(e) => setDateFromInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, flex: '1 1 150px' }}>
              <label htmlFor="report-to" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
                To
              </label>
              <input
                id="report-to"
                className="input"
                type="date"
                style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                value={dateToInput}
                onChange={(e) => setDateToInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160, flex: '1 1 160px' }}>
              <label htmlFor="report-user" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
                User / Agent
              </label>
              <select
                id="report-user"
                className="input"
                style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              >
                <option value="">All users / agents</option>
                {availableAgents.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, flex: '1 1 150px' }}>
              <label htmlFor="report-status" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
                Status
              </label>
              <select
                id="report-status"
                className="input"
                style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160, flex: '1 1 160px' }}>
              <label htmlFor="report-search" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
                Search
              </label>
              <input
                id="report-search"
                className="input"
                type="text"
                placeholder="Search phone, state, zip…"
                style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, height: 40, alignItems: 'center' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: 40, padding: '0 20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
              >
                Search
              </button>
              <button
                type="button"
                className="btn"
                style={{ height: 40, padding: '0 16px', display: 'inline-flex', alignItems: 'center' }}
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
          </form>

          {badRange ? (
            <p className="err" role="alert">
              The start date must be on or before the end date.
            </p>
          ) : (
            <>
              <h2 style={{ margin: '16px 0 8px', fontSize: 18 }}>{LABEL[applied.type]}</h2>
              {applied.type === 'CEO_CASES' && <CeoCasesView filters={filters} />}
              {applied.type === 'OUTSOURCE' && <OutsourceView filters={filters} />}
              {applied.type === 'TEAM_LEADER' && <TeamLeaderView filters={filters} />}
              {applied.type === 'ADMIN' && <AdminView filters={filters} />}
              {(isSuper || user.permissions.includes('report:export')) && (
                <ExportPanel key={applied.type + applied.dateFrom + applied.dateTo + applied.user} reportType={applied.type} filters={filters} />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
