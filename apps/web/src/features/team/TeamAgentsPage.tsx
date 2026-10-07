import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type CreateUserForm } from '../../services/admin';
import { supabase } from '../../services/supabase';
import { errorMessage } from '../../services/api-client';
import { Dialog, StateRows, pageStyle } from '../../design-system';
import { fmtDateTime } from '../../lib/format';
import type { SessionUserDto } from '../../schemas';
import type { UserDto } from '../../schemas/domain';
import { ResetPasswordDialog } from '../admin/UserDialogs';
import {
  assignAgentToTeamLeader,
  getAgentIdsForTeamLeader,
  getAllAssignments,
  getTeamLeaderIdForAgent,
  isAgentAssignedToTeamLeader,
} from '../../services/teamAssignments';
import { notifyLiveSync } from '../../services/liveSync';

export default function TeamAgentsPage({ user }: { user: SessionUserDto }) {
  const [resetTarget, setResetTarget] = useState<UserDto | null>(null);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['team-agents'],
    refetchInterval: 3000,
    queryFn: async () => {
      const candidates: any[] = [];

      // 1. Try admin service
      try {
        const res = await adminService.users({ limit: 100 });
        if (res?.data && Array.isArray(res.data)) {
          candidates.push(...res.data.filter((u) => u.roleKey === 'AGENT' || (u as any).role === 'AGENT'));
        }
      } catch {}

      // 2. Direct Supabase query fallback
      try {
        const { data } = await supabase
          .from('users')
          .select('id, organizationId, email, fullName, phone, status, roleId, isPrimarySuperAdmin, createdAt, updatedAt, roles:roleId(key, name)')
          .limit(100);

        if (data) {
          const agentsFromDb = (data as any[])
            .map((u) => ({
              id: u.id,
              email: u.email,
              fullName: u.fullName,
              phone: u.phone,
              status: u.status,
              roleKey: u.roles?.key || 'AGENT',
              roleName: u.roles?.name || 'Agent',
              createdAt: u.createdAt,
              updatedAt: u.updatedAt,
              isPrimarySuperAdmin: false,
            }))
            .filter((u) => u.roleKey === 'AGENT');
          for (const a of agentsFromDb) {
            if (!candidates.some((c) => c.id === a.id || c.email?.toLowerCase() === a.email?.toLowerCase())) {
              candidates.push(a);
            }
          }
        }
      } catch {}

      // 3. Cached users from local storage
      try {
        const rawCached = localStorage.getItem('cached_all_users');
        if (rawCached) {
          const cached = JSON.parse(rawCached);
          if (Array.isArray(cached)) {
            for (const u of cached) {
              if ((u.roleKey === 'AGENT' || u.role === 'AGENT') && !candidates.some((c) => c.id === u.id || c.email?.toLowerCase() === u.email?.toLowerCase())) {
                candidates.push(u);
              }
            }
          }
        }
      } catch {}

      // 4. Merge any agents from allAssignments for this Team Leader
      const allAssignments = getAllAssignments();
      const myAssignments = allAssignments.filter((asgn) =>
        (asgn.teamLeaderId && asgn.teamLeaderId.toLowerCase() === user.id.toLowerCase()) ||
        (asgn.teamLeaderEmail && asgn.teamLeaderEmail.toLowerCase() === (user.email || '').toLowerCase()) ||
        (asgn.teamLeaderName && asgn.teamLeaderName.toLowerCase() === (user.fullName || '').toLowerCase())
      );

      for (const asgn of myAssignments) {
        if (!candidates.some((c) => c.id === asgn.agentId || (asgn.agentEmail && c.email?.toLowerCase() === asgn.agentEmail.toLowerCase()))) {
          candidates.push({
            id: asgn.agentId,
            email: asgn.agentEmail || `${asgn.agentName?.toLowerCase().replace(/\s+/g, '') || 'agent'}@jdmedicare.com`,
            fullName: asgn.agentName || 'Assigned Agent',
            phone: null,
            status: 'ACTIVE',
            roleKey: 'AGENT',
            roleName: 'Agent',
            createdAt: asgn.assignedAt,
            updatedAt: asgn.assignedAt,
            isPrimarySuperAdmin: false,
          });
        }
      }

      return candidates;
    },
  });

  const allAssignments = getAllAssignments();

  // Scoped strictly to agents assigned to this Team Leader by Admin / Super Admin
  const scopedAgents = (list.data ?? []).filter((a) => {
    return isAgentAssignedToTeamLeader(a, user);
  });

  const agents = scopedAgents.filter((a) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return a.fullName.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || (a.phone && a.phone.includes(s));
  });

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>My agents</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #94a3b8)', fontSize: 13 }}>
            Assigned intake agents under your team supervision (assigned by Admin / Super Admin)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 16px' }}>
        <input
          className="input"
          style={{ maxWidth: 320, height: 40 }}
          placeholder="Search assigned agents by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="btn" onClick={() => setSearch('')}>
            Clear
          </button>
        )}
      </div>

      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Agent</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Status</th>
              <th scope="col">Assigned</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <StateRows
              loading={list.isLoading}
              empty={!list.isError && agents.length === 0}
              cols={6}
              message={
                search
                  ? 'No agents match your search.'
                  : 'No agents have been assigned to your team yet. Once an Admin or Super Admin assigns agents to you, they will appear here.'
              }
            />
            {agents.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.fullName}</strong>
                </td>
                <td>{a.email}</td>
                <td>{a.phone || '—'}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      background: a.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: a.status === 'ACTIVE' ? '#16a34a' : '#ef4444',
                    }}
                  >
                    {a.status}
                  </span>
                </td>
                <td>{a.createdAt ? fmtDateTime(a.createdAt) : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="btn"
                    style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                    onClick={() => setResetTarget(a as UserDto)}
                  >
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password to 000000 Dialog */}
      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => {
          setResetTarget(null);
          qc.invalidateQueries({ queryKey: ['team-agents'] });
        }}
      />
    </main>
  );
}
