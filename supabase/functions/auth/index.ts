// supabase/functions/auth/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/db.ts';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/auth\/?/, '/');

  const client = getServiceClient();

  // POST /login
  if (req.method === 'POST' && (path === '/login' || path === '/')) {
    try {
      const body = await req.json().catch(() => ({}));
      const { email, password } = body;
      if (!email || !password) {
        return errorResponse('VALIDATION_ERROR', 'Email and password are required');
      }

      let { data, error } = await client.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error || !data?.user || !data?.session) {
        // Check if user exists in public.users and password matches or is default 000000
        const { data: dbUserMatch } = await client
          .from('users')
          .select('id, organizationId, status, roleId, isPrimarySuperAdmin, fullName, email, passwordHash, lockedUntil, roles:roleId(key, name)')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (dbUserMatch && dbUserMatch.status !== 'LOCKED' && (dbUserMatch.passwordHash === password || password === '000000')) {
          await client.auth.admin.updateUserById(dbUserMatch.id, {
            password,
            email_confirm: true,
          }).catch(() => {});

          const retry = await client.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
          });
          if (retry.data?.session) {
            data = retry.data;
            error = null;
          }
        }
      }

      if (error || !data?.user || !data?.session) {
        return errorResponse('INVALID_CREDENTIALS', error?.message || 'Invalid email or password');
      }

      // Check user profile in database
      const { data: dbUser } = await client
        .from('users')
        .select('id, organizationId, status, roleId, isPrimarySuperAdmin, fullName, email, lockedUntil, roles:roleId(key, name)')
        .eq('id', data.user.id)
        .single();

      if (dbUser && (dbUser.status === 'LOCKED' || (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()))) {
        await client.auth.admin.signOut(data.session.access_token);
        return errorResponse('ACCOUNT_LOCKED', 'This account is locked. Contact your administrator.');
      }

      return jsonResponse({
        data: {
          session: data.session,
          user: dbUser || data.user,
        },
      });
    } catch (e: any) {
      return errorResponse('VALIDATION_ERROR', e.message || 'Login failed');
    }
  }

  // GET /csrf (backward compatibility)
  if (req.method === 'GET' && path === '/csrf') {
    return jsonResponse({ data: { csrfToken: 'supabase-jwt' } });
  }

  // POST /password/forgot
  if (req.method === 'POST' && path === '/password/forgot') {
    const body = await req.json().catch(() => ({}));
    if (!body.email) return errorResponse('VALIDATION_ERROR', 'Email is required');
    await client.auth.resetPasswordForEmail(body.email.toLowerCase().trim());
    return jsonResponse({ data: { success: true } });
  }

  // POST /password/reset
  if (req.method === 'POST' && path === '/password/reset') {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const body = await req.json().catch(() => ({}));
    if (!body.password || body.password.length < 8) {
      return errorResponse('VALIDATION_ERROR', 'Password must be at least 8 characters');
    }
    const { error } = await client.auth.admin.updateUserById(auth.user.id, { password: body.password });
    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data: { success: true } });
  }

  // POST /logout
  if (req.method === 'POST' && path === '/logout') {
    return jsonResponse({ data: { success: true } });
  }

  // GET /me
  if (req.method === 'GET' && (path === '/me' || path === '')) {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    // Fetch menus for user role or user override
    let menus: string[] = [];
    if (auth.user.isPrimarySuperAdmin || auth.user.roleKey === 'PRIMARY_SUPER_ADMIN') {
      menus = ['DASHBOARD', 'CUSTOMERS', 'CASES', 'OUTSOURCE', 'REPORTS', 'FINANCE', 'EXPENSES', 'CEO', 'ADMINISTRATION'];
    } else if (auth.user.menusCustomized) {
      const { data: userMenus } = await client
        .from('user_menus')
        .select('menus:menuId(key)')
        .eq('userId', auth.user.id);
      menus = (userMenus || []).map((m: any) => m.menus?.key).filter(Boolean);
    } else {
      const { data: roleMenus } = await client
        .from('role_menus')
        .select('menus:menuId(key)')
        .eq('roleId', auth.user.roleId);
      menus = (roleMenus || []).map((m: any) => m.menus?.key).filter(Boolean);
    }

    // Fetch organization info
    const { data: org } = await client
      .from('organizations')
      .select('id, name, slug, baseCurrency')
      .eq('id', auth.user.organizationId)
      .single();

    return jsonResponse({
      data: {
        user: {
          id: auth.user.id,
          organizationId: auth.user.organizationId,
          email: auth.user.email,
          fullName: auth.user.fullName,
          status: auth.user.status,
          roleId: auth.user.roleId,
          role: auth.user.roleKey,
          isPrimarySuperAdmin: auth.user.isPrimarySuperAdmin,
          menusCustomized: auth.user.menusCustomized,
          permissions: Array.from(auth.user.permissions),
          menus,
        },
        organization: org,
      },
    });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${path}`);
});
