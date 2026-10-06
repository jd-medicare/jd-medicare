// supabase/functions/audit/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth, requirePermission } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/db.ts';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const permErr = requirePermission(user, 'audit:view');
  if (permErr) return permErr;

  const url = new URL(req.url);
  const client = getServiceClient();

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  let query = client
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('organizationId', user.organizationId)
    .range(offset, offset + limit - 1)
    .order('createdAt', { ascending: false });

  // Only PSA can see isProtected logs
  if (!user.isPrimarySuperAdmin) {
    query = query.eq('isProtected', false);
  }

  const event = url.searchParams.get('event');
  if (event) query = query.eq('event', event);

  const entityType = url.searchParams.get('entityType');
  if (entityType) query = query.eq('entityType', entityType);

  const { data, count, error } = await query;
  if (error) return errorResponse('VALIDATION_ERROR', error.message);

  return jsonResponse({
    data: data || [],
    meta: {
      page,
      limit,
      total: count || 0,
      pageCount: Math.ceil((count || 0) / limit),
    },
  });
});
