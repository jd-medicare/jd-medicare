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
    const permErr = requirePermission(user, 'case:view');
    if (permErr) return permErr;

    const { data: cases, error } = await client
      .from('cases')
      .select('id, status')
      .eq('organizationId', user.organizationId);

    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    const allCases = cases || [];
    const total = allCases.length;
    const accepted = allCases.filter((c: any) => c.status === 'ACCEPTED').length;
    const rejected = allCases.filter((c: any) => c.status === 'REJECTED').length;
    const pending = allCases.filter((c: any) => c.status === 'PENDING' || c.status === 'SUBMITTED').length;
    const processed = accepted + rejected;

    return jsonResponse({
      data: {
        total,
        remaining: pending,
        pending,
        accepted,
        acceptedCount: accepted,
        rejected,
        rejectedCount: rejected,
        totalProcessed: processed,
        processingRate: total > 0 ? Math.round((processed / total) * 100) : 0,
        acceptanceRate: processed > 0 ? Math.round((accepted / processed) * 100) : 0,
        rejectionRate: processed > 0 ? Math.round((rejected / processed) * 100) : 0,
      },
    });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});
