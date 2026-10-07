// supabase/functions/outsource/index.ts
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
  const pathname = url.pathname.replace(/^\/outsource\/?/, '/');
  const client = getServiceClient();

  // GET /cases
  if (req.method === 'GET' && (pathname === '/cases' || pathname === '/')) {
    const permErr = requirePermission(user, 'case:view');
    if (permErr) return permErr;

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const { data, count, error } = await client
      .from('cases')
      .select(`
        id, organizationId, customerId, status, version, agentId, teamLeaderId, processedById,
        processedAt, rejectionReason, submittedAt, createdAt, updatedAt,
        customer:customers(id, firstName, lastName, phone, dateOfBirth, address, zipCode, extra),
        callRecord:call_records(durationSeconds)
      `, { count: 'exact' })
      .eq('organizationId', user.organizationId)
      .in('status', ['SUBMITTED', 'PENDING'])
      .range(offset, offset + limit - 1)
      .order('submittedAt', { ascending: true });

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
  }

  // GET /summary
  if (req.method === 'GET' && pathname === '/summary') {
    const permErr = requirePermission(user, 'report:view');
    if (permErr) return permErr;

    const { data: actions, error } = await client
      .from('accept_reject_actions')
      .select('decision')
      .eq('organizationId', user.organizationId)
      .eq('actorId', user.id);

    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    const total = actions?.length || 0;
    const accepted = actions?.filter((a: any) => a.decision === 'ACCEPT').length || 0;
    const rejected = actions?.filter((a: any) => a.decision === 'REJECT').length || 0;

    return jsonResponse({
      data: {
        totalProcessed: total,
        acceptedCount: accepted,
        rejectedCount: rejected,
        acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
      },
    });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});
