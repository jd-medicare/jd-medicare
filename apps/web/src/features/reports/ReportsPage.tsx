import { useState } from 'react';
import { pageStyle } from '../../design-system';
import type { SessionUserDto } from '../../schemas';
import { AdminView, OutsourceView, TeamLeaderView } from './ReportViews';
import ExportPanel from './ExportPanel';

const LABEL: Record<string, string> = { OUTSOURCE: 'Outsource', TEAM_LEADER: 'Team performance', ADMIN: 'Administration' };
// Which reports to offer by role. UI convenience only; the API enforces report access.
const BY_ROLE: Record<string, string[]> = {
  OUTSOURCE: ['OUTSOURCE'], TEAM_LEADER: ['TEAM_LEADER'], ADMIN: ['ADMIN'], CEO: ['OUTSOURCE', 'TEAM_LEADER', 'ADMIN'], PRIMARY_SUPER_ADMIN: ['OUTSOURCE', 'TEAM_LEADER', 'ADMIN'],
};

export default function ReportsPage({ user }: { user: SessionUserDto }) {
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.permissions.includes('*'));
  const types = isSuper ? ['OUTSOURCE', 'TEAM_LEADER', 'ADMIN'] : (BY_ROLE[user.roleKey] ?? []);
  const [type, setType] = useState(types[0] ?? ''); const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  const filters: Record<string, string> = {}; if (dateFrom) filters.dateFrom = dateFrom; if (dateTo) filters.dateTo = dateTo;
  const badRange = !!dateFrom && !!dateTo && dateFrom > dateTo;
  return (
    <main style={pageStyle}>
      <h1 style={{ margin: 0 }}>Reports</h1>
      {types.length === 0 ? <p role="alert">No reports are available for your role.</p> : (<>
        <form style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }} onSubmit={(e) => e.preventDefault()} aria-label="Report filters">
          {types.length > 1 && <label style={{ margin: 0 }}>Report<select className="input" value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}</select></label>}
          <label style={{ margin: 0 }}>From<input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label style={{ margin: 0 }}>To<input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
        </form>
        {badRange ? <p className="err" role="alert">The start date must be on or before the end date.</p> : (<>
          <h2 style={{ margin: 0, fontSize: 18 }}>{LABEL[type]} summary</h2>
          {type === 'OUTSOURCE' && <OutsourceView filters={filters} />}
          {type === 'TEAM_LEADER' && <TeamLeaderView filters={filters} />}
          {type === 'ADMIN' && <AdminView filters={filters} />}
          {(isSuper || user.permissions.includes('report:export')) && <ExportPanel key={type + dateFrom + dateTo} reportType={type} filters={filters} />}
        </>)}
      </>)}
    </main>
  );
}
