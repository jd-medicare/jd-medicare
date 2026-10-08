import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { Dialog, Pager, StateRows, pageStyle } from '../../design-system';
import { fmtDateTime } from '../../lib/format';
import type { SessionUserDto } from '../../schemas';
import type { UserDto } from '../../schemas/domain';
import {
  CreateUserDialog,
  EditUserDialog,
  MenusDialog,
  PermissionsDialog,
  ReasonDialog,
  ResetPasswordDialog,
  RoleDialog,
} from './UserDialogs';
import {
  assignAgentToTeamLeader,
  unassignAgent,
  getTeamLeaderIdForAgent,
  getAllAssignments,
} from '../../services/teamAssignments';

export default function UsersPage({ user }: { user: SessionUserDto }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [editU, setEditU] = useState<UserDto | null>(null);
  const [perm, setPerm] = useState<UserDto | null>(null);
  const [menuU, setMenuU] = useState<UserDto | null>(null);
  const [roleU, setRoleU] = useState<UserDto | null>(null);
  const [lock, setLock] = useState<{ u: UserDto; kind: 'lock' | 'unlock' } | null>(null);
  const [resetU, setResetU] = useState<UserDto | null>(null);
  const [assignTarget, setAssignTarget] = useState<UserDto | null>(null);
  const [showAssignments, setShowAssignments] = useState(false);

  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['users', page, status],
    queryFn: () => adminService.users({ page, pageSize: 50, status }),
  });

  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'ADMIN' || user.permissions?.includes('*'));
  const rawRows = list.data?.data ?? [];

  useEffect(() => {
    if (rawRows.length > 0) {
      try {
        localStorage.setItem('cached_all_users', JSON.stringify(rawRows));
      } catch {}
    }
  }, [rawRows]);

  // Super admin is completely hidden from non-superadmin users ("superadmin is full hide from other user")
  const rows = rawRows.filter((u) => {
    if (!isSuper) {
      if (u.isPrimarySuperAdmin || u.roleKey === 'PRIMARY_SUPER_ADMIN' || u.fullName.toLowerCase().includes('super admin')) {
        return false;
      }
    }
    return true;
  });

  const teamLeaders = rows.filter((u) => u.roleKey === 'TEAM_LEADER');
  const agents = rows.filter((u) => u.roleKey === 'AGENT');
  const assignments = getAllAssignments();

  const has = (p: string) => isSuper || user.permissions?.includes(p);

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, flex: 1 }}>Users</h1>
        {has('menu:manage') && (
          <Link to="/admin/menus" className="btn" style={{ textDecoration: 'none' }}>
            📋 Manage Menus
          </Link>
        )}
        {has('audit:view') && <Link to="/admin/audit">Audit log</Link>}
        <button
          type="button"
          className="btn"
          style={{ background: showAssignments ? 'var(--sidebar-active-bg, #3b82f6)' : undefined, color: showAssignments ? '#fff' : undefined }}
          onClick={() => setShowAssignments(!showAssignments)}
        >
          {showAssignments ? 'Hide TL Assignments' : '👥 Team Leader Assignments'}
        </button>
        {has('user:create') && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Create user
          </button>
        )}
      </div>

      {/* Team Leader & Agent Assignments Overview Card */}
      {showAssignments && (
        <section className="card" style={{ marginTop: 12, marginBottom: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Team Leader & Agent Assignments</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
                Assign intake agents to specific Team Leaders. Each Team Leader only sees cases and reports for their assigned agents.
              </p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary, #3b82f6)' }}>
              {teamLeaders.length} Team Leader{teamLeaders.length === 1 ? '' : 's'} • {agents.length} Agent{agents.length === 1 ? '' : 's'}
            </span>
          </div>

          {teamLeaders.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
              No users with the Team Leader role found. Create a user or change an existing user's role to <strong>TEAM_LEADER</strong>.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {teamLeaders.map((tl) => {
                const assignedToTl = agents.filter((a) => getTeamLeaderIdForAgent(a.id) === tl.id);
                return (
                  <div
                    key={tl.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: 'var(--bg-muted, rgba(255, 255, 255, 0.04))',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{tl.fullName}</strong>
                      <span className="badge b-ACTIVE" style={{ fontSize: 11 }}>Team Leader</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted, #94a3b8)', marginBottom: 8 }}>{tl.email}</div>

                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      Assigned Agents ({assignedToTl.length}):
                    </div>
                    {assignedToTl.length === 0 ? (
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--muted, #94a3b8)', fontStyle: 'italic' }}>
                        No agents assigned yet.
                      </p>
                    ) : (
                      <ul style={{ margin: '0 0 8px', paddingLeft: 16, fontSize: 13 }}>
                        {assignedToTl.map((a) => (
                          <li key={a.id} style={{ marginBottom: 2 }}>
                            <span>{a.fullName}</span>{' '}
                            <button
                              type="button"
                              className="btn"
                              style={{ height: 20, padding: '0 4px', fontSize: 10, marginLeft: 6 }}
                              onClick={() => {
                                unassignAgent(a.id);
                                qc.invalidateQueries({ queryKey: ['users'] });
                              }}
                            >
                              ✕ Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <label style={{ margin: '8px 0', maxWidth: 220, display: 'block' }}>
        Status
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="LOCKED">Locked</option>
          <option value="INVITED">Invited</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </label>

      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <StateRows loading={list.isLoading} empty={!list.isError && rows.length === 0} cols={6} message="No users match this filter." />
            {rows.map((u) => {
              const isPSA = Boolean(u.isPrimarySuperAdmin || u.roleKey === 'PRIMARY_SUPER_ADMIN');
              const isAgent = u.roleKey === 'AGENT';
              const assignedTlId = isAgent ? getTeamLeaderIdForAgent(u.id) : null;
              const assignedTl = assignedTlId ? teamLeaders.find((tl) => tl.id === assignedTlId) : null;

              return (
                <tr key={u.id}>
                  <td>
                    <strong>{u.fullName}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span>{u.roleKey}</span>
                    {isAgent && (
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        {assignedTl ? (
                          <span style={{ color: 'var(--primary, #3b82f6)' }}>
                            TL: <strong>{assignedTl.fullName}</strong>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted, #94a3b8)', fontStyle: 'italic' }}>
                            TL: Unassigned
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge b-${u.status}`}>
                      {u.status.charAt(0) + u.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td>{fmtDateTime(u.lastLoginAt)}</td>
                  <td>
                    <UserRowActions
                      u={u}
                      isPSA={isPSA}
                      isSuper={isSuper}
                      isAgent={isAgent}
                      canEdit={isSuper || user.roleKey === 'ADMIN' || has('user:update')}
                      has={has}
                      onEdit={() => setEditU(u)}
                      onRole={() => setRoleU(u)}
                      onAssignTl={() => setAssignTarget(u)}
                      onMenus={() => setMenuU(u)}
                      onPerms={() => setPerm(u)}
                      onResetPwd={() => setResetU(u)}
                      onLockUnlock={() => setLock({ u, kind: u.status === 'LOCKED' ? 'unlock' : 'lock' })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager meta={list.data?.meta} page={page} onPage={setPage} />

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} canMenus={has('menu:manage')} />
      <EditUserDialog target={editU} onClose={() => setEditU(null)} />
      <MenusDialog target={menuU} onClose={() => setMenuU(null)} />
      <RoleDialog target={roleU} onClose={() => setRoleU(null)} />
      <PermissionsDialog target={perm} onClose={() => setPerm(null)} />
      <ReasonDialog target={lock} onClose={() => setLock(null)} />
      <ResetPasswordDialog target={resetU} onClose={() => setResetU(null)} />

      {/* Assign Team Leader Dialog for Admin / Super Admin */}
      <AssignTeamLeaderDialog
        target={assignTarget}
        teamLeaders={teamLeaders}
        onClose={() => setAssignTarget(null)}
        onSaved={() => {
          setAssignTarget(null);
          qc.invalidateQueries({ queryKey: ['users'] });
          qc.invalidateQueries({ queryKey: ['team-agents'] });
          qc.invalidateQueries({ queryKey: ['cases'] });
        }}
      />
    </main>
  );
}

function AssignTeamLeaderDialog({
  target,
  teamLeaders,
  onClose,
  onSaved,
}: {
  target: UserDto | null;
  teamLeaders: UserDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedTlId, setSelectedTlId] = useState('');

  useEffect(() => {
    if (target) {
      setSelectedTlId(getTeamLeaderIdForAgent(target.id) || '');
    }
  }, [target]);

  if (!target) return null;

  function handleSave() {
    if (!target) return;
    if (!selectedTlId) {
      unassignAgent(target.id);
    } else {
      const tl = teamLeaders.find((t) => t.id === selectedTlId);
      assignAgentToTeamLeader(target.id, selectedTlId, target.fullName, tl?.fullName, target.email, tl?.email);
    }
    onSaved();
  }

  return (
    <Dialog open={!!target} title="Assign Team Leader to Agent" onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <p style={{ margin: 0 }}>
          Assign intake agent <strong>{target.fullName}</strong> ({target.email}) to a Team Leader:
        </p>

        <div>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Select Team Leader</label>
          <select
            className="input"
            style={{ width: '100%', height: 42 }}
            value={selectedTlId}
            onChange={(e) => setSelectedTlId(e.target.value)}
          >
            <option value="">— Unassigned (No Team Leader) —</option>
            {teamLeaders.map((tl) => (
              <option key={tl.id} value={tl.id}>
                {tl.fullName} ({tl.email})
              </option>
            ))}
          </select>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted, #94a3b8)' }}>
          Only the assigned Team Leader will see this agent and their case records in their Team view.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save assignment
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function UserRowActions({
  u,
  isPSA,
  isSuper,
  isAgent,
  canEdit,
  has,
  onEdit,
  onRole,
  onAssignTl,
  onMenus,
  onPerms,
  onResetPwd,
  onLockUnlock,
}: {
  u: UserDto;
  isPSA: boolean;
  isSuper: boolean;
  isAgent: boolean;
  canEdit: boolean;
  has: (p: string) => boolean;
  onEdit: () => void;
  onRole: () => void;
  onAssignTl: () => void;
  onMenus: () => void;
  onPerms: () => void;
  onResetPwd: () => void;
  onLockUnlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Protected Primary Super Admin: ordinary administrators cannot modify or lock
  if (isPSA && !isSuper) {
    return (
      <span className="badge b-ACTIVE" title="Primary Super Admin root account is protected">
        Protected
      </span>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isPSA && (
          <span className="badge b-ACTIVE" style={{ fontSize: 11 }}>
            Protected
          </span>
        )}
        <button
          type="button"
          className="btn"
          style={{ padding: '3px 10px', fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          Actions ▾
        </button>
      </div>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 60,
            minWidth: 195,
            background: 'var(--surface, #1e293b)',
            border: '1px solid var(--border, #334155)',
            borderRadius: 'var(--radius-sm, 8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {canEdit && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left' }}
              onClick={() => { setOpen(false); onEdit(); }}
            >
              ✏️ Edit User
            </button>
          )}

          {!isPSA && has('role:manage') && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left' }}
              onClick={() => { setOpen(false); onRole(); }}
            >
              👤 Assign Role
            </button>
          )}

          {isAgent && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left' }}
              onClick={() => { setOpen(false); onAssignTl(); }}
            >
              👥 Assign Team Leader
            </button>
          )}

          {!isPSA && has('menu:manage') && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left' }}
              onClick={() => { setOpen(false); onMenus(); }}
            >
              📋 Manage Menus
            </button>
          )}

          {!isPSA && has('permission:manage') && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left' }}
              onClick={() => { setOpen(false); onPerms(); }}
            >
              🔑 Manage Permissions
            </button>
          )}

          {!isPSA && has('user:update') && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left' }}
              onClick={() => { setOpen(false); onResetPwd(); }}
            >
              🔒 Reset Password
            </button>
          )}

          <div style={{ height: 1, background: 'var(--border, #334155)', margin: '2px 0' }} />

          {!isPSA && has('user:lock') && u.status === 'ACTIVE' && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left', color: 'var(--danger, #ef4444)' }}
              onClick={() => { setOpen(false); onLockUnlock(); }}
            >
              🚫 Lock Account
            </button>
          )}

          {!isPSA && has('user:unlock') && u.status === 'LOCKED' && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 13, textAlign: 'left', color: 'var(--success, #22c55e)' }}
              onClick={() => { setOpen(false); onLockUnlock(); }}
            >
              🔓 Unlock Account
            </button>
          )}
        </div>
      )}
    </div>
  );
}
