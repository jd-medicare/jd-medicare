// supabase/functions/users/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth, requirePermission } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/db.ts';

async function syncUserMenus(client: any, userId: string, rawItems: string[]) {
  if (!rawItems || rawItems.length === 0) {
    await client.from('user_menus').delete().eq('userId', userId);
    await client.from('users').update({ menusCustomized: false }).eq('id', userId);
    return;
  }

  const { data: dbMenus } = await client.from('menus').select('id, key');
  const keyToId = new Map<string, string>();
  const idToId = new Set<string>();

  if (dbMenus) {
    for (const m of dbMenus) {
      if (m.key) keyToId.set(m.key.toUpperCase(), m.id);
      if (m.id) idToId.add(m.id);
    }
  }

  const validMenuIds: string[] = [];
  for (const item of rawItems) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;
    if (idToId.has(trimmed)) {
      validMenuIds.push(trimmed);
    } else {
      const upper = trimmed.toUpperCase();
      let foundId = keyToId.get(upper);
      if (!foundId) {
        // Auto-create menu key if missing
        const { data: newMenu } = await client.from('menus').insert({ key: upper }).select('id, key').maybeSingle();
        if (newMenu?.id) {
          foundId = newMenu.id;
          keyToId.set(upper, foundId);
          idToId.add(foundId);
        }
      }
      if (foundId && !validMenuIds.includes(foundId)) {
        validMenuIds.push(foundId);
      }
    }
  }

  await client.from('user_menus').delete().eq('userId', userId);
  if (validMenuIds.length > 0) {
    await client.from('user_menus').insert(
      validMenuIds.map((menuId) => ({ userId, menuId }))
    );
    await client.from('users').update({ menusCustomized: true }).eq('id', userId);
  } else {
    await client.from('users').update({ menusCustomized: false }).eq('id', userId);
  }
}

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

    const menusParam = body.menus || body.menuIds;
    if (Array.isArray(menusParam) && menusParam.length > 0) {
      await syncUserMenus(client, authUserId, menusParam);
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
    // Authorization: ADMIN or PRIMARY_SUPER_ADMIN
    const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN');
    const isAdmin = Boolean(isSuper || user.roleKey === 'ADMIN' || user.permissions.includes('user:update') || user.permissions.includes('*'));
    if (!isAdmin) {
      return errorResponse('FORBIDDEN', 'Only authorized administrators can edit user details');
    }

    const { data: targetUser, error: targetErr } = await client
      .from('users')
      .select('id, organizationId, email, fullName, isPrimarySuperAdmin')
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .maybeSingle();

    if (targetErr || !targetUser) return errorResponse('NOT_FOUND', 'User not found');

    // Protected PSA check: ordinary administrators cannot modify Primary Super Admin
    if (targetUser.isPrimarySuperAdmin && !isSuper) {
      return errorResponse('PROTECTED_USER', 'The Primary Super Admin account cannot be modified by ordinary administrators');
    }

    const body = await req.json().catch(() => ({}));
    const updateData: Record<string, any> = {};

    if (body.fullName !== undefined) {
      const trimmedName = String(body.fullName || '').trim();
      if (!trimmedName) {
        return errorResponse('VALIDATION_ERROR', 'Full name is required');
      }
      updateData.fullName = trimmedName;
    }

    if (body.email !== undefined) {
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        return errorResponse('VALIDATION_ERROR', 'A valid email address is required');
      }

      // Check case-insensitive email uniqueness excluding targetId
      const { data: existingUser } = await client
        .from('users')
        .select('id')
        .eq('organizationId', user.organizationId)
        .ilike('email', cleanEmail)
        .neq('id', targetId)
        .maybeSingle();

      if (existingUser) {
        return errorResponse('DUPLICATE_EMAIL', 'A user with this email address already exists');
      }

      updateData.email = cleanEmail;

      // Update Supabase Auth email if changed
      if (cleanEmail !== targetUser.email?.toLowerCase()) {
        try {
          await client.auth.admin.updateUserById(targetId, {
            email: cleanEmail,
            email_confirm: true,
          });
        } catch (authErr: any) {
          console.warn('Supabase auth email update warning:', authErr?.message || authErr);
        }
      }
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone ? String(body.phone).trim() : null;
    }

    if (updateData.fullName) {
      try {
        await client.auth.admin.updateUserById(targetId, {
          user_metadata: { fullName: updateData.fullName },
        });
      } catch (authErr: any) {
        console.warn('Supabase auth metadata update warning:', authErr?.message || authErr);
      }
    }

    updateData.updatedAt = new Date().toISOString();

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', targetId)
      .eq('organizationId', user.organizationId)
      .select('id, organizationId, email, fullName, phone, status, roleId, isPrimarySuperAdmin, menusCustomized, createdAt, updatedAt')
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

    const { data: target } = await client.from('users').select('isPrimarySuperAdmin').eq('id', targetId).maybeSingle();
    if (target?.isPrimarySuperAdmin && !user.isPrimarySuperAdmin && user.roleKey !== 'PRIMARY_SUPER_ADMIN') {
      return errorResponse('PROTECTED_USER', 'The Primary Super Admin role cannot be modified');
    }

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

    const { data: target } = await client.from('users').select('isPrimarySuperAdmin').eq('id', targetId).maybeSingle();
    if (target?.isPrimarySuperAdmin && !user.isPrimarySuperAdmin && user.roleKey !== 'PRIMARY_SUPER_ADMIN') {
      return errorResponse('PROTECTED_USER', 'The Primary Super Admin permissions cannot be modified');
    }

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

    const { data: target } = await client.from('users').select('isPrimarySuperAdmin').eq('id', targetId).maybeSingle();
    if (target?.isPrimarySuperAdmin && !user.isPrimarySuperAdmin && user.roleKey !== 'PRIMARY_SUPER_ADMIN') {
      return errorResponse('PROTECTED_USER', 'The Primary Super Admin menus cannot be modified');
    }

    const body = await req.json().catch(() => ({}));
    const rawMenus: string[] = body.menus || [];
    const rawMenuIds: string[] = body.menuIds || [];
    const requested = Array.from(new Set([...rawMenus, ...rawMenuIds]));

    await syncUserMenus(client, targetId, requested);
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
