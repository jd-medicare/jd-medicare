// supabase/functions/roles-permissions/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth } from '../_shared/auth.ts';
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
      .select('id, key, name, role_permissions(permissionId), role_menus(menuId)')
      .order('name');

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({
      data: (data || []).map((r: any) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        permissionIds: (r.role_permissions || []).map((rp: any) => rp.permissionId),
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
    return jsonResponse({ data });
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
