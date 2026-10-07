// supabase/functions/_shared/auth.ts
import { getServiceClient } from './db.ts';
import { errorResponse } from './errors.ts';

export interface UserContext {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  status: string;
  roleId: string;
  roleKey: string;
  isPrimarySuperAdmin: boolean;
  menusCustomized: boolean;
  permissions: Set<string>;
  rawToken: string;
}

export type AuthResult = { ok: true; user: UserContext } | { ok: false; response: Response };

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: errorResponse('UNAUTHENTICATED', 'Missing or malformed Authorization header.'),
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      ok: false,
      response: errorResponse('UNAUTHENTICATED', 'Empty bearer token.'),
    };
  }

  const client = getServiceClient();

  // 1. Verify token with Supabase Auth
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData?.user) {
    return {
      ok: false,
      response: errorResponse('UNAUTHENTICATED', authError?.message || 'Invalid or expired session token.'),
    };
  }

  const authUserId = authData.user.id;
  const authUserEmail = authData.user.email?.toLowerCase();

  // 2. Fetch user profile from database
  const { data: dbUser, error: dbError } = await client
    .from('users')
    .select(`
      id,
      organizationId,
      email,
      fullName,
      status,
      roleId,
      isPrimarySuperAdmin,
      menusCustomized,
      lockedUntil,
      roles:roleId (
        key,
        name
      )
    `)
    .or(`id.eq.${authUserId},email.eq.${authUserEmail}`)
    .single();

  if (dbError || !dbUser) {
    return {
      ok: false,
      response: errorResponse('UNAUTHENTICATED', 'User profile not found in database.'),
    };
  }

  // 3. Status checks
  if (dbUser.status === 'LOCKED' || (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date())) {
    return {
      ok: false,
      response: errorResponse('ACCOUNT_LOCKED', 'User account is locked.'),
    };
  }

  if (dbUser.status === 'DISABLED' || dbUser.status === 'SUSPENDED') {
    return {
      ok: false,
      response: errorResponse('FORBIDDEN', 'User account is inactive or disabled.'),
    };
  }

  // 4. Fetch permissions
  const roleKey = (dbUser.roles as any)?.key || '';
  const permissionsSet = new Set<string>();

  const ALL_PERMISSIONS = [
    'user:create', 'user:view', 'user:update', 'user:lock', 'user:unlock',
    'role:manage', 'permission:manage', 'menu:manage',
    'customer:create', 'customer:view', 'customer:update',
    'case:create', 'case:view', 'case:update', 'case:accept', 'case:reject', 'case:modify_processed',
    'call_length:view', 'call_length:create', 'call_length:update',
    'report:view', 'report:export',
    'finance:view', 'income:create', 'income:update', 'expense:create', 'expense:update',
    'expense_head:create', 'expense_head:update',
    'ceo:dashboard', 'audit:view',
  ];

  const isSuper = Boolean(
    dbUser.isPrimarySuperAdmin ||
    roleKey === 'PRIMARY_SUPER_ADMIN' ||
    roleKey === 'SUPER_ADMIN' ||
    roleKey === 'ADMIN' ||
    roleKey.includes('SUPER_ADMIN') ||
    roleKey.includes('ADMIN')
  );

  if (isSuper) {
    // Primary super admin, super admin, and admin have all permissions and full wildcard access
    permissionsSet.add('*');
    for (const p of ALL_PERMISSIONS) permissionsSet.add(p);
  } else {
    // Role standard defaults to ensure essential access is never blocked
    const ROLE_DEFAULTS: Record<string, string[]> = {
      ADMIN: ALL_PERMISSIONS,
      CEO: [
        'case:view', 'customer:view', 'call_length:view',
        'report:view', 'report:export',
        'finance:view', 'income:create', 'income:update', 'expense:create', 'expense:update',
        'expense_head:create', 'expense_head:update',
        'ceo:dashboard', 'audit:view',
      ],
      TEAM_LEADER: [
        'case:view', 'customer:view', 'call_length:view', 'call_length:update',
        'report:view', 'report:export', 'user:view',
      ],
      OUTSOURCE: [
        'case:view', 'case:accept', 'case:reject', 'case:modify_processed',
        'customer:view', 'call_length:view', 'report:view',
      ],
      AGENT: [
        'customer:create', 'customer:view', 'customer:update',
        'case:create', 'case:view', 'call_length:view', 'call_length:create', 'call_length:update',
      ],
    };

    if (ROLE_DEFAULTS[roleKey]) {
      for (const p of ROLE_DEFAULTS[roleKey]) permissionsSet.add(p);
    }

    // Load role permissions from DB
    const { data: rolePerms } = await client
      .from('role_permissions')
      .select('permissions:permissionId(key)')
      .eq('roleId', dbUser.roleId);

    if (rolePerms) {
      for (const rp of rolePerms) {
        const k = (rp.permissions as any)?.key;
        if (k) permissionsSet.add(k);
      }
    }

    // Load custom user permissions
    const { data: userPerms } = await client
      .from('user_permissions')
      .select('permissions:permissionId(key)')
      .eq('userId', dbUser.id);

    if (userPerms) {
      for (const up of userPerms) {
        const k = (up.permissions as any)?.key;
        if (k) permissionsSet.add(k);
      }
    }
  }

  const userContext: UserContext = {
    id: dbUser.id,
    organizationId: dbUser.organizationId,
    email: dbUser.email,
    fullName: dbUser.fullName,
    status: dbUser.status,
    roleId: dbUser.roleId,
    roleKey,
    isPrimarySuperAdmin: Boolean(dbUser.isPrimarySuperAdmin),
    menusCustomized: Boolean(dbUser.menusCustomized),
    permissions: permissionsSet,
    rawToken: token,
  };

  return { ok: true, user: userContext };
}

export function hasPermission(user: UserContext, requiredPermission: string): boolean {
  const r = (user.roleKey || '').toUpperCase();
  if (user.isPrimarySuperAdmin || r === 'PRIMARY_SUPER_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN' || r.includes('SUPER_ADMIN') || r.includes('ADMIN')) return true;
  if (user.permissions.has('*')) return true;
  return user.permissions.has(requiredPermission);
}

export function requirePermission(user: UserContext, requiredPermission: string): Response | null {
  if (!hasPermission(user, requiredPermission)) {
    return errorResponse(
      'FORBIDDEN',
      `Forbidden: Required permission '${requiredPermission}' is missing.`
    );
  }
  return null;
}
