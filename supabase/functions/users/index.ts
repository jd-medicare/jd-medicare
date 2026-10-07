// supabase/functions/users/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth, requirePermission } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/db.ts';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const url = new URL(req.url);
  // Match path pattern
  const pathname = url.pathname.replace(/^\/users\/?/, '/');
  const client = getServiceClient();

    // GET / (list users)
  if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
    const isTeamLeader = user.roleKey === 'TEAM_LEADER';
    if (!isTeamLeader) {
      const permErr = requirePermission(user, 'user:view');
      if (permErr) return permErr;
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    let query = client
      .from('users')
      .select('id, organizationId, email, fullName, phone, status, roleId, isPrimarySuperAdmin, menusCustomized, createdAt, updatedAt, roles:roleId(key, name)', { count: 'exact' })
      .eq('organizationId', user.organizationId)
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: false });

    const status = url.searchParams.get('status');
    if (status) query = query.eq('status', status);

    const roleId = url.searchParams.get('roleId');
    if (roleId) query = query.eq('roleId', roleId);

    const search = url.searchParams.get('search');
    if (search) query = query.or(`fullName.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, count, error } = await query;
    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    return jsonResponse({
      data: (data || []).map((u: any) => ({
        ...u,
        role: u.roles?.key,
        roleName: u.roles?.name,
      })),
      meta: {
        page,
        limit,
        total: count || 0,
        pageCount: Math.ceil((count || 0) / limit),
      },
    });
  }

  // POST / (create user)
  if (req.method === 'POST' && (pathname === '/' || pathname === '')) {
    const isTeamLeader = user.roleKey === 'TEAM_LEADER';
    if (!isTeamLeader) {
      const permErr = requirePermission(user, 'user:create');
      if (permErr) return permErr;
    }

    const body = await req.json().catch(() => ({}));
    const { email, fullName, roleId, phone } = body;
    if (!email || !fullName || !roleId) {
      return errorResponse('VALIDATION_ERROR', 'Email, fullName, and roleId are required');
    }

    const cleanEmail = email.toLowerCase().trim();
    const initialPassword = body.password || '000000';

    // Create user in Supabase Auth with provided password
    let authUserId: string;
    const { data: authUser, error: authError } = await client.auth.admin.createUser({
      email: cleanEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { fullName },
    });

    if (authError) {
      // If user already exists in Auth, fetch their ID and update their password
      const { data: listData } = await client.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (existing) {
        authUserId = existing.id;
        await client.auth.admin.updateUserById(existing.id, {
          password: initialPassword,
          email_confirm: true,
          user_metadata: { fullName },
        });
      } else {
        return errorResponse('VALIDATION_ERROR', authError.message);
      }
    } else {
      authUserId = authUser.user.id;
    }

    // Insert user row into database
    const { data: newUser, error: dbError } = await client
      .from('users')
      .upsert({
        id: authUserId,
        organizationId: user.organizationId,
        email: cleanEmail,
        fullName,
        phone: phone || null,
        passwordHash: initialPassword,
        roleId,
        status: 'ACTIVE',
        isPrimarySuperAdmin: false,
      })
      .select('id, email, fullName, phone, status, roleId, createdAt')
      .single();

    if (dbError) {
      return errorResponse('VALIDATION_ERROR', dbError.message);
    }

    return jsonResponse({ data: newUser }, 201);
  }

  // Parse ID routes: /:id, /:id/lock, /:id/unlock, etc.
  const match = pathname.match(/^\/([0-9a-fA-F-]+)(\/.*)?$/);
  if (!match) {
    return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
  }

  const targetId = match[1];
  const subRoute = match[2] || '';

  // GET /:id
  if (req.method === 'GET' && subRoute === '') {
    const permErr = requirePermission(user, 'user:view');
    if (permErr) return permErr;

    const { data, error } = await client
      .from('users')
      .select('id, organizationId, email, fullName, phone, status, roleId, isPrimarySuperAdmin, menusCustomized, createdAt, updatedAt, roles:roleId(key, name), user_profiles(jobTitle, timezone, locale)')
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .single();

    if (error || !data) return errorResponse('NOT_FOUND', 'User not found');
    return jsonResponse({ data });
  }

  // PATCH /:id
  if (req.method === 'PATCH' && subRoute === '') {
    const permErr = requirePermission(user, 'user:update');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const updateData: Record<string, any> = {};
    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  // POST /:id/lock
  if (req.method === 'POST' && subRoute === '/lock') {
    const permErr = requirePermission(user, 'user:lock');
    if (permErr) return permErr;

    // Check if target is PSA
    const { data: target } = await client.from('users').select('isPrimarySuperAdmin').eq('id', targetId).single();
    if (target?.isPrimarySuperAdmin) return errorResponse('PROTECTED_USER', 'The Primary Super Admin cannot be locked');

    const { data, error } = await client
      .from('users')
      .update({ status: 'LOCKED', lockedUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString() })
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  // POST /:id/unlock
  if (req.method === 'POST' && subRoute === '/unlock') {
    const permErr = requirePermission(user, 'user:unlock');
    if (permErr) return permErr;

    const { data, error } = await client
      .from('users')
      .update({ status: 'ACTIVE', lockedUntil: null, failedLoginCount: 0 })
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  // POST /:id/activate
  if (req.method === 'POST' && subRoute === '/activate') {
    const permErr = requirePermission(user, 'user:update');
    if (permErr) return permErr;

    const { data, error } = await client
      .from('users')
      .update({ status: 'ACTIVE' })
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  // POST /:id/disable
  if (req.method === 'POST' && subRoute === '/disable') {
    const permErr = requirePermission(user, 'user:update');
    if (permErr) return permErr;

    const { data: target } = await client.from('users').select('isPrimarySuperAdmin').eq('id', targetId).single();
    if (target?.isPrimarySuperAdmin) return errorResponse('PROTECTED_USER', 'The Primary Super Admin cannot be disabled');

    const { data, error } = await client
      .from('users')
      .update({ status: 'DISABLED' })
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  // PUT /:id/role
  if (req.method === 'PUT' && subRoute === '/role') {
    const permErr = requirePermission(user, 'role:manage');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    if (!body.roleId) return errorResponse('VALIDATION_ERROR', 'roleId is required');

    const { data, error } = await client
      .from('users')
      .update({ roleId: body.roleId })
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  // PUT /:id/permissions
  if (req.method === 'PUT' && subRoute === '/permissions') {
    const permErr = requirePermission(user, 'permission:manage');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const permissionIds: string[] = body.permissionIds || [];

    await client.from('user_permissions').delete().eq('userId', targetId);
    if (permissionIds.length > 0) {
      await client.from('user_permissions').insert(
        permissionIds.map((pId) => ({ userId: targetId, permissionId: pId }))
      );
    }
    return jsonResponse({ data: { success: true } });
  }

  // PUT /:id/menus
  if (req.method === 'PUT' && subRoute === '/menus') {
    const permErr = requirePermission(user, 'menu:manage');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const menuIds: string[] = body.menuIds || [];

    await client.from('user_menus').delete().eq('userId', targetId);
    if (menuIds.length > 0) {
      await client.from('user_menus').insert(
        menuIds.map((mId) => ({ userId: targetId, menuId: mId }))
      );
      await client.from('users').update({ menusCustomized: true }).eq('id', targetId);
    } else {
      await client.from('users').update({ menusCustomized: false }).eq('id', targetId);
    }
    return jsonResponse({ data: { success: true } });
  }

  // POST /:id/reset-password
  if (req.method === 'POST' && subRoute === '/reset-password') {
    const permErr = requirePermission(user, 'user:update');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const newPassword = body.password || '000000';

    await client.auth.admin.updateUserById(targetId, {
      password: newPassword,
      email_confirm: true,
    }).catch((e: any) => console.warn('Auth admin reset error:', e));

    await client.from('users').update({
      passwordHash: newPassword,
      updatedAt: new Date().toISOString(),
    }).eq('id', targetId);

    return jsonResponse({ data: { success: true, message: 'Password reset to ' + newPassword } });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});
