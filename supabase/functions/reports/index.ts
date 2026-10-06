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
      .select('id, status, submittedAt, agentId, agent:agentId(id, fullName)')
      .eq('organizationId', user.organizationId);

    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    const total = cases?.length || 0;
    const accepted = cases?.filter((c: any) => c.status === 'ACCEPTED').length || 0;
    const rejected = cases?.filter((c: any) => c.status === 'REJECTED').length || 0;
    const pending = cases?.filter((c: any) => c.status === 'PENDING' || c.status === 'SUBMITTED').length || 0;
    const remaining = pending;

    const processed = accepted + rejected;
    const processingRate = total > 0 ? Math.round((processed / total) * 100) : 0;
    const acceptanceRate = processed > 0 ? Math.round((accepted / processed) * 100) : 0;
    const rejectionRate = processed > 0 ? Math.round((rejected / processed) * 100) : 0;

    // Group by Agent
    const agentMap: Record<string, { agentId: string; agentName: string; total: number; accepted: number; rejected: number; pending: number }> = {};
    for (const c of cases || []) {
      const aId = c.agentId || 'unknown';
      const aName = (c.agent as any)?.fullName || 'Unassigned';
      if (!agentMap[aId]) {
        agentMap[aId] = { agentId: aId, agentName: aName, total: 0, accepted: 0, rejected: 0, pending: 0 };
      }
      agentMap[aId].total += 1;
      if (c.status === 'ACCEPTED') agentMap[aId].accepted += 1;
      else if (c.status === 'REJECTED') agentMap[aId].rejected += 1;
      else agentMap[aId].pending += 1;
    }

    // Group by Date
    const dateMap: Record<string, { date: string; total: number; accepted: number; rejected: number; pending: number }> = {};
    for (const c of cases || []) {
      const d = c.submittedAt ? c.submittedAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
      if (!dateMap[d]) {
        dateMap[d] = { date: d, total: 0, accepted: 0, rejected: 0, pending: 0 };
      }
      dateMap[d].total += 1;
      if (c.status === 'ACCEPTED') dateMap[d].accepted += 1;
      else if (c.status === 'REJECTED') dateMap[d].rejected += 1;
      else dateMap[d].pending += 1;
    }

    return jsonResponse({
      data: {
        summary: {
          total,
          accepted,
          rejected,
          pending,
          remaining,
          processingRate,
          acceptanceRate,
          rejectionRate,
          byAgent: Object.values(agentMap),
          byDate: Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date)),
        },
        rows: [],
      },
    });
  }

  // 2. GET /team-leader
  if (req.method === 'GET' && pathname === '/team-leader') {
    const permErr = requirePermission(user, 'report:view');
    if (permErr) return permErr;

    const { data: cases, error } = await client
      .from('cases')
      .select('id, status, agentId, agent:agentId(id, fullName), callRecord:call_records(durationSeconds)')
      .eq('organizationId', user.organizationId);

    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    const totalRecords = cases?.length || 0;
    const accepted = cases?.filter((c: any) => c.status === 'ACCEPTED').length || 0;
    const rejected = cases?.filter((c: any) => c.status === 'REJECTED').length || 0;
    const pending = cases?.filter((c: any) => c.status === 'PENDING' || c.status === 'SUBMITTED').length || 0;
    const reviewedRecords = accepted + rejected;
    const modifiedRecords = reviewedRecords;

    const durations = (cases || []).map((c: any) => c.callRecord?.durationSeconds || 0);
    const totalSeconds = durations.reduce((a: number, b: number) => a + b, 0);
    const averageSeconds = totalRecords > 0 ? Math.round(totalSeconds / totalRecords) : 0;
    const minSeconds = durations.length > 0 ? Math.min(...durations) : 0;
    const maxSeconds = durations.length > 0 ? Math.max(...durations) : 0;

    // Group by Agent
    const agentMap: Record<string, { agentId: string; agentName: string; total: number; totalSeconds: number }> = {};
    for (const c of cases || []) {
      const aId = c.agentId || 'unknown';
      const aName = (c.agent as any)?.fullName || 'Unassigned';
      if (!agentMap[aId]) {
        agentMap[aId] = { agentId: aId, agentName: aName, total: 0, totalSeconds: 0 };
      }
      agentMap[aId].total += 1;
      agentMap[aId].totalSeconds += (c.callRecord?.durationSeconds || 0);
    }

    const byAgent = Object.values(agentMap).map((a) => ({
      agentId: a.agentId,
      agentName: a.agentName,
      total: a.total,
      averageCallSeconds: a.total > 0 ? Math.round(a.totalSeconds / a.total) : 0,
    }));

    return jsonResponse({
      data: {
        summary: {
          totalRecords,
          reviewedRecords,
          modifiedRecords,
          accepted,
          rejected,
          pending,
          callLength: {
            totalSeconds,
            averageSeconds,
            minSeconds,
            maxSeconds,
          },
          byAgent,
        },
        rows: [],
      },
    });
  }

  // 3. GET /admin
  if (req.method === 'GET' && pathname === '/admin') {
    const permErr = requirePermission(user, 'report:view');
    if (permErr) return permErr;

    const { data: users } = await client
      .from('users')
      .select('id, status, roleId, roles:roleId(key)')
      .eq('organizationId', user.organizationId);

    const { data: cases } = await client
      .from('cases')
      .select('id, status')
      .eq('organizationId', user.organizationId);

    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter((u: any) => u.status === 'ACTIVE').length || 0;
    const lockedUsers = users?.filter((u: any) => u.status === 'LOCKED').length || 0;

    const totalRecords = cases?.length || 0;
    const accepted = cases?.filter((c: any) => c.status === 'ACCEPTED').length || 0;
    const rejected = cases?.filter((c: any) => c.status === 'REJECTED').length || 0;
    const pending = cases?.filter((c: any) => c.status === 'PENDING' || c.status === 'SUBMITTED').length || 0;

    // Group by Role
    const roleMap: Record<string, number> = {};
    for (const u of users || []) {
      const rKey = (u.roles as any)?.key || 'UNKNOWN';
      roleMap[rKey] = (roleMap[rKey] || 0) + 1;
    }
    const usersByRole = Object.entries(roleMap).map(([roleKey, count]) => ({ roleKey, count }));

    return jsonResponse({
      data: {
        summary: {
          totalUsers,
          activeUsers,
          lockedUsers,
          totalRecords,
          accepted,
          rejected,
          pending,
          usersByRole,
        },
        rows: [],
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
        status: 'READY',
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
