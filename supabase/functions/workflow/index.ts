// supabase/functions/workflow/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth, requirePermission } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/db.ts';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const permErr = requirePermission(user, 'case:view');
  if (permErr) return permErr;

  const url = new URL(req.url);
  const client = getServiceClient();

  const caseId = url.searchParams.get('caseId');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  let query = client
    .from('workflow_transitions')
    .select('*', { count: 'exact' })
    .eq('organizationId', user.organizationId)
    .range(offset, offset + limit - 1)
    .order('seq', { ascending: false });

  if (caseId) query = query.eq('caseId', caseId);

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
