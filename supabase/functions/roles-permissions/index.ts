// supabase/functions/roles-permissions/index.ts
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
  const path = url.pathname.replace(/^\/roles-permissions\/?/, '/');
  const client = getServiceClient();

  // GET /roles
  if (req.method === 'GET' && (path === '/roles' || path.endsWith('/roles'))) {
    const { data, error } = await client
      .from('roles')
      .select('id, key, name, role_permissions(permissionId, permissions:permissionId(key)), role_menus(menuId, menus:menuId(key))')
      .order('name');

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({
      data: (data || []).map((r: any) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        permissions: (r.role_permissions || []).map((rp: any) => rp.permissions?.key).filter(Boolean),
        permissionIds: (r.role_permissions || []).map((rp: any) => rp.permissionId),
        menus: (r.role_menus || []).map((rm: any) => rm.menus?.key).filter(Boolean),
        menuIds: (r.role_menus || []).map((rm: any) => rm.menuId),
      })),
    });
  }

  // GET /permissions
  if (req.method === 'GET' && (path === '/permissions' || path.endsWith('/permissions'))) {
    const { data, error } = await client
      .from('permissions')
      .select('id, key, description')
      .order('key');

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  // GET /menus
  if (req.method === 'GET' && (path === '/menus' || path.endsWith('/menus'))) {
    const { data, error } = await client
      .from('menus')
      .select('id, key')
      .order('key');

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const cleanData = (data || []).filter((m: any) => m.key && !isUuid(m.key));
    return jsonResponse({ data: cleanData });
  }

  // DELETE /menus/:key (remove item system-wide for all roles and users)
  const deleteMatch = path.match(/^\/menus\/([A-Za-z0-9_-]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const permErr = requirePermission(user, 'menu:manage');
    if (permErr) return permErr;

    const rawKey = deleteMatch[1].toUpperCase();
    const { data: menuRow } = await client.from('menus').select('id, key').or(`key.eq.${rawKey},id.eq.${deleteMatch[1]}`).maybeSingle();
    if (menuRow?.id) {
      await client.from('role_menus').delete().eq('menuId', menuRow.id);
      await client.from('user_menus').delete().eq('menuId', menuRow.id);
      await client.from('menus').delete().eq('id', menuRow.id);
    }
    return jsonResponse({ data: { success: true } });
  }

  // POST /menus
  if (req.method === 'POST' && (path === '/menus' || path.endsWith('/menus'))) {
    const permErr = requirePermission(user, 'menu:manage');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const key = String(body.key || body.name || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!key) return errorResponse('VALIDATION_ERROR', 'Menu key is required');

    const { data, error } = await client
      .from('menus')
      .upsert({ key }, { onConflict: 'key' })
      .select('id, key')
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data }, 201);
  }

  // GET /organizations/current
  if (req.method === 'GET' && (path === '/organizations/current' || path.endsWith('/current'))) {
    const { data, error } = await client
      .from('organizations')
      .select('id, name, slug, baseCurrency, createdAt, updatedAt')
      .eq('id', user.organizationId)
      .single();

    if (error || !data) return errorResponse('NOT_FOUND', 'Organization not found');
    return jsonResponse({ data });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${path}`);
});
