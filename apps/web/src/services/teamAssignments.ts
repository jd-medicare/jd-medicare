/**
 * Persistent Team Leader <-> Agent assignment management.
 * Admin and Super Admin can assign agents to team leaders.
 * Each Team Leader only sees their assigned agents and the cases/reports of those agents.
 */

export interface TeamAssignmentRecord {
  agentId: string;
  agentEmail?: string;
  agentName?: string;
  teamLeaderId: string;
  teamLeaderEmail?: string;
  teamLeaderName?: string;
  assignedAt: string;
}

const STORAGE_KEY = 'tl_agent_assignments';

export function getAllAssignments(): TeamAssignmentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAllAssignments(list: TeamAssignmentRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('saveAllAssignments error:', e);
  }
}

export function assignAgentToTeamLeader(
  agentId: string,
  teamLeaderId: string,
  agentName?: string,
  teamLeaderName?: string,
  agentEmail?: string,
  teamLeaderEmail?: string
) {
  const list = getAllAssignments();
  const existingIdx = list.findIndex(
    (a) => a.agentId === agentId || (agentEmail && a.agentEmail?.toLowerCase() === agentEmail.toLowerCase())
  );
  const record: TeamAssignmentRecord = {
    agentId,
    agentEmail: agentEmail?.toLowerCase().trim(),
    agentName,
    teamLeaderId,
    teamLeaderEmail: teamLeaderEmail?.toLowerCase().trim(),
    teamLeaderName,
    assignedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }

  saveAllAssignments(list);
  localStorage.setItem(`agent_tl_${agentId}`, teamLeaderId);
  if (agentEmail) {
    localStorage.setItem(`agent_tl_${agentEmail.toLowerCase().trim()}`, teamLeaderId);
  }
}

export function unassignAgent(agentId: string) {
  const list = getAllAssignments().filter((a) => a.agentId !== agentId);
  saveAllAssignments(list);
  localStorage.removeItem(`agent_tl_${agentId}`);
}

export function getTeamLeaderIdForAgent(agentId: string): string | null {
  const stored = localStorage.getItem(`agent_tl_${agentId}`);
  if (stored) return stored;
  const list = getAllAssignments();
  const found = list.find((a) => a.agentId === agentId || (a.agentEmail && a.agentEmail.toLowerCase() === agentId.toLowerCase()));
  return found?.teamLeaderId ?? null;
}

export function getAgentIdsForTeamLeader(teamLeaderId: string): string[] {
  const list = getAllAssignments();
  const tlid = (teamLeaderId || '').toLowerCase().trim();
  return list
    .filter((a) => a.teamLeaderId.toLowerCase() === tlid || (a.teamLeaderEmail && a.teamLeaderEmail.toLowerCase() === tlid))
    .map((a) => a.agentId);
}

export function isAgentAssignedToTeamLeader(
  agent: { id: string; email?: string; fullName?: string } | string,
  teamLeader: { id: string; email?: string; fullName?: string } | string
): boolean {
  const list = getAllAssignments();
  const aId = (typeof agent === 'string' ? agent : agent.id || '').toLowerCase().trim();
  const aEmail = (typeof agent === 'string' ? '' : agent.email || '').toLowerCase().trim();
  const aName = (typeof agent === 'string' ? '' : agent.fullName || '').toLowerCase().trim();

  const tlId = (typeof teamLeader === 'string' ? teamLeader : teamLeader.id || '').toLowerCase().trim();
  const tlEmail = (typeof teamLeader === 'string' ? '' : teamLeader.email || '').toLowerCase().trim();
  const tlName = (typeof teamLeader === 'string' ? '' : teamLeader.fullName || '').toLowerCase().trim();

  return list.some((rec) => {
    const tlMatch =
      (rec.teamLeaderId && rec.teamLeaderId.toLowerCase() === tlId) ||
      (rec.teamLeaderEmail && tlEmail && rec.teamLeaderEmail.toLowerCase() === tlEmail) ||
      (rec.teamLeaderName && tlName && rec.teamLeaderName.toLowerCase() === tlName);

    const aMatch =
      (rec.agentId && rec.agentId.toLowerCase() === aId) ||
      (rec.agentEmail && aEmail && rec.agentEmail.toLowerCase() === aEmail) ||
      (rec.agentName && aName && rec.agentName.toLowerCase() === aName);

    return tlMatch && aMatch;
  });
}
