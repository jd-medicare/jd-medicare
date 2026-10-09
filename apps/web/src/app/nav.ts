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

export function getMenusForPermissions(permissions: string[]): string[] {
  const menus = new Set<string>(['DASHBOARD']);
  for (const p of permissions || []) {
    const lower = p.toLowerCase();
    if (lower.startsWith('customer:')) menus.add('CUSTOMERS');
    if (lower.startsWith('case:')) {
      menus.add('CASES');
      if (lower === 'case:accept' || lower === 'case:reject' || lower === 'case:modify_processed') {
        menus.add('OUTSOURCE');
      }
    }
    if (lower.startsWith('call_length:')) menus.add('CASES');
    if (lower.startsWith('report:')) menus.add('REPORTS');
    if (lower.startsWith('finance:') || lower.startsWith('income:')) menus.add('FINANCE');
    if (lower.startsWith('expense:') || lower.startsWith('expense_head:')) menus.add('EXPENSES');
    if (lower.startsWith('ceo:')) menus.add('CEO');
    if (lower.startsWith('user:') || lower.startsWith('role:') || lower.startsWith('permission:') || lower.startsWith('menu:')) {
      menus.add('ADMINISTRATION');
    }
    if (lower.startsWith('audit:')) {
      menus.add('ADMINISTRATION');
      menus.add('CEO');
    }
  }
  return Array.from(menus);
}

export function canAccessPathByPermissions(perms: string[], path: string): boolean {
  if (!perms || perms.length === 0) return false;
  if (perms.includes('*')) return true;
  const pSet = new Set(perms.map((x) => x.toLowerCase()));

  if (path === '/customers/new') return pSet.has('customer:create') || pSet.has('customer:update') || pSet.has('customer:view');
  if (path === '/cases') return pSet.has('case:view') || pSet.has('case:create') || pSet.has('case:update') || pSet.has('case:accept');
  if (path === '/team/agents') return pSet.has('case:view') || pSet.has('user:view');
  if (path === '/outsource') return pSet.has('case:accept') || pSet.has('case:reject') || pSet.has('case:modify_processed') || pSet.has('case:view');
  if (path === '/reports') return pSet.has('report:view') || pSet.has('report:export');
  if (path === '/ceo') return pSet.has('ceo:dashboard');
  if (path === '/finance/income') return pSet.has('finance:view') || pSet.has('income:create') || pSet.has('income:update');
  if (path === '/finance/expenses') return pSet.has('finance:view') || pSet.has('expense:create') || pSet.has('expense:update') || pSet.has('expense_head:create') || pSet.has('expense_head:update');
  if (path === '/admin/users') return pSet.has('user:view') || pSet.has('user:create') || pSet.has('user:update') || pSet.has('user:lock') || pSet.has('user:unlock') || pSet.has('role:manage') || pSet.has('permission:manage');
  if (path === '/admin/menus') return pSet.has('menu:manage');
  if (path === '/admin/audit') return pSet.has('audit:view');
  return false;
}

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
    // Menus assigned to this user (case-insensitive) plus inferred from permissions
    const userMenus = new Set<string>((u.menus || []).map((m) => m.toUpperCase()));
    const inferred = getMenusForPermissions(u.permissions || []);
    for (const m of inferred) userMenus.add(m.toUpperCase());

    const userPerms = u.permissions || [];
    const hasWildcard = userPerms.includes('*');

    list = fullNav.filter((n) => {
      // 1. If user has menu
      if (userMenus.has(n.menu.toUpperCase())) return true;
      // 2. Wildcard admin
      if (hasWildcard) return true;
      // 3. Directly matching permission
      if (n.perm && userPerms.includes(n.perm)) return true;
      // 4. Path-level access granted by permission
      return canAccessPathByPermissions(userPerms, n.path);
    });
  }

  // Agents cannot manage other agents unless granted explicit user/case permission
  if (u.roleKey === 'AGENT' && !u.permissions?.includes('user:view') && !u.permissions?.includes('*')) {
    list = list.filter((n) => n.path !== '/team/agents');
  }
  // Team Leader must not see Audit log unless granted explicit audit permission by admin/superadmin
  if (u.roleKey === 'TEAM_LEADER' && !u.permissions?.includes('audit:view') && !u.permissions?.includes('*')) {
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
