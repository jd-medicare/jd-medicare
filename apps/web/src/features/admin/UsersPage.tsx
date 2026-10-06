import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { Pager, StateRows, pageStyle } from '../../design-system';
import { fmtDateTime } from '../../lib/format';
import type { SessionUserDto } from '../../schemas';
import type { UserDto } from '../../schemas/domain';
import { CreateUserDialog, PermissionsDialog, ReasonDialog } from './UserDialogs';

export default function UsersPage({ user }: { user: SessionUserDto }) {
  const [page, setPage] = useState(1); const [status, setStatus] = useState(''); const [creating, setCreating] = useState(false);
  const [perm, setPerm] = useState<UserDto | null>(null); const [lock, setLock] = useState<{ u: UserDto; kind: 'lock' | 'unlock' } | null>(null);
  const list = useQuery({ queryKey: ['users', page, status], queryFn: () => adminService.users({ page, pageSize: 25, status }) });
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.permissions.includes('*'));
  const rows = list.data?.data ?? []; const has = (p: string) => isSuper || user.permissions.includes(p);
  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, flex: 1 }}>Users</h1>
        {has('audit:view') && <Link to="/admin/audit">Audit log</Link>}
        {has('user:create') && <button className="btn btn-primary" onClick={() => setCreating(true)}>Create user</button>}
      </div>
      <label style={{ margin: 0, maxWidth: 220 }}>Status<select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="LOCKED">Locked</option><option value="INVITED">Invited</option><option value="DISABLED">Disabled</option></select></label>
      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}
      <div className="table-wrap"><table>
        <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Last sign-in</th><th scope="col">Actions</th></tr></thead>
        <tbody>
          <StateRows loading={list.isLoading} empty={!list.isError && rows.length === 0} cols={6} message="No users match this filter." />
          {rows.map((u) => (
            <tr key={u.id}><td>{u.fullName}</td><td>{u.email}</td><td>{u.roleKey}</td><td>{u.status}</td><td>{fmtDateTime(u.lastLoginAt)}</td>
              <td><span style={{ display: 'flex', gap: 8 }}>
                {has('user:lock') && u.status === 'ACTIVE' && <button className="btn" aria-label={`Lock ${u.fullName}`} onClick={() => setLock({ u, kind: 'lock' })}>Lock</button>}
                {has('user:unlock') && u.status === 'LOCKED' && <button className="btn" aria-label={`Unlock ${u.fullName}`} onClick={() => setLock({ u, kind: 'unlock' })}>Unlock</button>}
                {has('permission:manage') && <button className="btn" aria-label={`Edit permissions for ${u.fullName}`} onClick={() => setPerm(u)}>Permissions</button>}
              </span></td></tr>))}
        </tbody></table></div>
      <Pager meta={list.data?.meta} page={page} onPage={setPage} />
      <CreateUserDialog open={creating} onClose={() => setCreating(false)} />
      <PermissionsDialog target={perm} onClose={() => setPerm(null)} />
      <ReasonDialog target={lock} onClose={() => setLock(null)} />
    </main>
  );
}
