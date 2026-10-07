import type { SessionUserDto } from '../schemas';

// Single source for nav links, route gating and role landing pages. UI gating only; the API enforces access.
export interface NavItem { menu: string; label: string; path: string; perm?: string }

export interface CustomMenuDef {
  key: string;
  label: string;
  path: string;
  perm?: string;
  description?: string;
}

export function getCustomMenus(): CustomMenuDef[] {
  try {
    const raw = localStorage.getItem('custom_created_menus');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomMenu(m: CustomMenuDef) {
  try {
    const list = getCustomMenus();
    const existing = list.findIndex((x) => x.key.toUpperCase() === m.key.toUpperCase());
    if (existing >= 0) list[existing] = m;
    else list.push(m);
    localStorage.setItem('custom_created_menus', JSON.stringify(list));
  } catch {}
}

export function deleteCustomMenu(key: string) {
  try {
    const list = getCustomMenus().filter((x) => x.key.toUpperCase() !== key.toUpperCase());
    localStorage.setItem('custom_created_menus', JSON.stringify(list));
  } catch {}
}

export function isSuperUser(u?: SessionUserDto | { isPrimarySuperAdmin?: boolean; roleKey?: string; role?: string; permissions?: string[] } | null): boolean {
  if (!u) return false;
  const r = (u.roleKey || (u as any).role || '').toUpperCase();
  return Boolean(
    u.isPrimarySuperAdmin ||
    r === 'PRIMARY_SUPER_ADMIN' ||
    r === 'SUPER_ADMIN' ||
    r === 'ADMIN' ||
    r.includes('SUPER_ADMIN') ||
    r.includes('SUPERADMIN') ||
    r.includes('ADMIN') ||
    u.permissions?.includes('*')
  );
}

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
  { menu: 'ADMINISTRATION', label: 'Menus', path: '/admin/menus', perm: 'menu:manage' },
  { menu: 'ADMINISTRATION', label: 'Audit log', path: '/admin/audit', perm: 'audit:view' },
];

export const navFor = (u: SessionUserDto) => {
  const customItems: NavItem[] = getCustomMenus().map((cm) => ({
    menu: cm.key.toUpperCase(),
    label: cm.label,
    path: cm.path,
    perm: cm.perm,
  }));
  const fullNav = [...NAV, ...customItems];

  let list = fullNav;
  if (isSuperUser(u)) {
    list = fullNav;
  } else {
    // Menus assigned to this user (case-insensitive)
    const userMenus = (u.menus || []).map((m) => m.toUpperCase());
    list = fullNav.filter((n) => userMenus.includes(n.menu.toUpperCase()));
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

  // Guarantee that every user with a valid account has at least one landing page
  if (list.length === 0) {
    if (u.roleKey === 'OUTSOURCE') list = [{ menu: 'OUTSOURCE', label: 'Outsource', path: '/outsource' }];
    else if (u.roleKey === 'CEO') list = [{ menu: 'CEO', label: 'CEO dashboard', path: '/ceo' }];
    else if (u.roleKey === 'TEAM_LEADER') list = [{ menu: 'CASES', label: 'Cases', path: '/cases' }];
    else list = [{ menu: 'CUSTOMERS', label: 'New customer', path: '/customers/new' }, { menu: 'CASES', label: 'Cases', path: '/cases' }];
  }

  return list;
};

const HOME: Record<string, string> = {
  AGENT: '/cases',
  TEAM_LEADER: '/cases',
  OUTSOURCE: '/outsource',
  ADMIN: '/admin/users',
  SUPER_ADMIN: '/admin/users',
  PRIMARY_SUPER_ADMIN: '/admin/users',
  CEO: '/ceo',
};

/** Landing page by role, falling back to the first link the user can actually open. */
export function homeFor(u: SessionUserDto): string {
  const nav = navFor(u);
  const h = HOME[u.roleKey];
  if (h && nav.some((n) => n.path === h)) return h;
  return nav[0]?.path || '/cases';
}
