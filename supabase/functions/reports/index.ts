// supabase/functions/reports/index.ts
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
  const pathname = url.pathname.replace(/^\/reports\/?/, '/');
  const client = getServiceClient();

  // 1. GET /outsource
  if (req.method === 'GET' && pathname === '/outsource') {
    const permErr = requirePermission(user, 'report:view');
    if (permErr) return permErr;

    const { data: cases, error } = await client
      .from('cases')
      .select('status, processedById, processedAt')
      .eq('organizationId', user.organizationId)
      .not('processedAt', 'is', null);

    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    const total = cases?.length || 0;
    const accepted = cases?.filter((c: any) => c.status === 'ACCEPTED').length || 0;
    const rejected = cases?.filter((c: any) => c.status === 'REJECTED').length || 0;

    return jsonResponse({
      data: {
        totalProcessed: total,
        acceptedCount: accepted,
        rejectedCount: rejected,
        acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
      },
    });
  }

  // 2. GET /team-leader
  if (req.method === 'GET' && pathname === '/team-leader') {
    const permErr = requirePermission(user, 'report:view');
    if (permErr) return permErr;

    const { data: cases, error } = await client
      .from('cases')
      .select('agentId, status, callRecord:call_records(durationSeconds)')
      .eq('organizationId', user.organizationId);

    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    const total = cases?.length || 0;
    const accepted = cases?.filter((c: any) => c.status === 'ACCEPTED').length || 0;
    const totalDuration = (cases || []).reduce((acc: number, c: any) => acc + (c.callRecord?.durationSeconds || 0), 0);

    return jsonResponse({
      data: {
        totalCases: total,
        acceptedCount: accepted,
        avgCallDuration: total > 0 ? Math.round(totalDuration / total) : 0,
      },
    });
  }

  // 3. GET /admin
  if (req.method === 'GET' && pathname === '/admin') {
    const permErr = requirePermission(user, 'report:view');
    if (permErr) return permErr;

    const { count: usersCount } = await client.from('users').select('*', { count: 'exact', head: true }).eq('organizationId', user.organizationId);
    const { count: casesCount } = await client.from('cases').select('*', { count: 'exact', head: true }).eq('organizationId', user.organizationId);
    const { count: customersCount } = await client.from('customers').select('*', { count: 'exact', head: true }).eq('organizationId', user.organizationId);

    return jsonResponse({
      data: {
        totalUsers: usersCount || 0,
        totalCases: casesCount || 0,
        totalCustomers: customersCount || 0,
      },
    });
  }

  // 4. POST /exports (create export)
  if (req.method === 'POST' && pathname === '/exports') {
    const permErr = requirePermission(user, 'report:export');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const { reportType, format, filters } = body;
    if (!reportType || !format) {
      return errorResponse('VALIDATION_ERROR', 'reportType and format are required');
    }

    const { data: exp, error } = await client
      .from('report_exports')
      .insert({
        organizationId: user.organizationId,
        requestedById: user.id,
        reportType,
        format,
        filters: filters || {},
        status: 'READY', // Direct synchronous completion in Edge environment
        rowCount: 0,
      })
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data: exp }, 201);
  }

  // 5. GET /exports/:id
  const expMatch = pathname.match(/^\/exports\/([0-9a-fA-F-]+)$/);
  if (req.method === 'GET' && expMatch) {
    const expId = expMatch[1];
    const { data, error } = await client
      .from('report_exports')
      .select('*')
      .eq('id', expId)
      .eq('organizationId', user.organizationId)
      .single();

    if (error || !data) return errorResponse('NOT_FOUND', 'Export job not found');
    return jsonResponse({ data });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});
