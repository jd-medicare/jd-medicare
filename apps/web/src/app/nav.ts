import type { SessionUserDto } from '../schemas';
// Single source for nav links, route gating and role landing pages. UI gating only; the API enforces access.
export interface NavItem { menu: string; label: string; path: string; perm?: string }
export const NAV: NavItem[] = [
  { menu: 'CUSTOMERS', label: 'New customer', path: '/customers/new', perm: 'customer:create' },
  { menu: 'CASES', label: 'Cases', path: '/cases', perm: 'case:view' },
  { menu: 'CASES', label: 'Agents', path: '/team/agents', perm: 'case:view' },
  { menu: 'OUTSOURCE', label: 'Outsource', path: '/outsource', perm: 'case:view' },
  { menu: 'REPORTS', label: 'Reports', path: '/reports', perm: 'report:view' },
  { menu: 'CEO', label: 'CEO dashboard', path: '/ceo', perm: 'ceo:dashboard' },
  { menu: 'CEO', label: 'Audit log', path: '/admin/audit', perm: 'ceo:dashboard' },
  { menu: 'FINANCE', label: 'Income', path: '/finance/income', perm: 'finance:view' },
  { menu: 'EXPENSES', label: 'Expenses', path: '/finance/expenses', perm: 'finance:view' },
  { menu: 'ADMINISTRATION', label: 'Users', path: '/admin/users', perm: 'user:view' },
  { menu: 'ADMINISTRATION', label: 'Audit log', path: '/admin/audit', perm: 'audit:view' },
];
export const navFor = (u: SessionUserDto) => {
  let list = NAV;
  if (u.isPrimarySuperAdmin || u.roleKey === 'PRIMARY_SUPER_ADMIN' || u.permissions.includes('*')) {
    list = NAV;
  } else {
    list = NAV.filter((n) => u.menus.includes(n.menu) && (!n.perm || u.permissions.includes(n.perm)));
  }
  // Agents cannot manage other agents
  if (u.roleKey === 'AGENT') {
    list = list.filter((n) => n.path !== '/team/agents');
  }
  // Team Leader must NEVER see Audit log ("show only to ceo not to team lader")
  if (u.roleKey === 'TEAM_LEADER') {
    list = list.filter((n) => n.path !== '/admin/audit');
  }

  // Deduplicate by path so Audit log (or any other item) is never shown twice in sidebar
  const seenPaths = new Set<string>();
  list = list.filter((item) => {
    if (seenPaths.has(item.path)) return false;
    seenPaths.add(item.path);
    return true;
  });

  return list;
};
const HOME: Record<string, string> = {
  AGENT: '/cases', TEAM_LEADER: '/cases', OUTSOURCE: '/outsource', ADMIN: '/admin/users', PRIMARY_SUPER_ADMIN: '/admin/users', CEO: '/ceo',
};
/** Landing page by role, falling back to the first link the user can actually open. */
export function homeFor(u: SessionUserDto): string | null {
  const nav = navFor(u); const h = HOME[u.roleKey];
  return h && nav.some((n) => n.path === h) ? h : nav[0]?.path ?? null;
}
