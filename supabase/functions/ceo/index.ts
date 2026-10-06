// supabase/functions/ceo/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth, requirePermission } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/db.ts';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const permErr = requirePermission(user, 'ceo:dashboard');
  if (permErr) return permErr;

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/ceo\/?/, '/');
  const client = getServiceClient();

  // GET /dashboard
  if (req.method === 'GET' && (pathname === '/dashboard' || pathname === '/')) {
    const { data: cases } = await client
      .from('cases')
      .select('status, agentId, teamLeaderId, processedById')
      .eq('organizationId', user.organizationId);

    const { data: incomes } = await client
      .from('incomes')
      .select('amount')
      .eq('organizationId', user.organizationId)
      .eq('status', 'ACTIVE');

    const { data: expenses } = await client
      .from('expenses')
      .select('amount')
      .eq('organizationId', user.organizationId)
      .eq('status', 'ACTIVE');

    const totalCases = cases?.length || 0;
    const acceptedCases = cases?.filter((c: any) => c.status === 'ACCEPTED').length || 0;
    const totalIncome = (incomes || []).reduce((acc: number, cur: any) => acc + Number(cur.amount), 0);
    const totalExpense = (expenses || []).reduce((acc: number, cur: any) => acc + Number(cur.amount), 0);

    return jsonResponse({
      data: {
        totalCases,
        acceptedCases,
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
      },
    });
  }

  // GET /performance/agents
  if (req.method === 'GET' && pathname === '/performance/agents') {
    const { data: cases } = await client
      .from('cases')
      .select('agentId, status, callRecord:call_records(durationSeconds)')
      .eq('organizationId', user.organizationId);

    const agentMap: Record<string, { total: number; accepted: number; totalDuration: number }> = {};
    for (const c of cases || []) {
      if (!agentMap[c.agentId]) agentMap[c.agentId] = { total: 0, accepted: 0, totalDuration: 0 };
      agentMap[c.agentId].total += 1;
      if (c.status === 'ACCEPTED') agentMap[c.agentId].accepted += 1;
      agentMap[c.agentId].totalDuration += c.callRecord?.durationSeconds || 0;
    }

    return jsonResponse({ data: agentMap });
  }

  // GET /performance/team-leaders
  if (req.method === 'GET' && pathname === '/performance/team-leaders') {
    const { data: cases } = await client
      .from('cases')
      .select('teamLeaderId, status')
      .eq('organizationId', user.organizationId)
      .not('teamLeaderId', 'is', null);

    const tlMap: Record<string, { total: number; accepted: number }> = {};
    for (const c of cases || []) {
      if (!c.teamLeaderId) continue;
      if (!tlMap[c.teamLeaderId]) tlMap[c.teamLeaderId] = { total: 0, accepted: 0 };
      tlMap[c.teamLeaderId].total += 1;
      if (c.status === 'ACCEPTED') tlMap[c.teamLeaderId].accepted += 1;
    }

    return jsonResponse({ data: tlMap });
  }

  // GET /performance/outsource
  if (req.method === 'GET' && pathname === '/performance/outsource') {
    const { data: cases } = await client
      .from('cases')
      .select('processedById, status')
      .eq('organizationId', user.organizationId)
      .not('processedById', 'is', null);

    const outMap: Record<string, { total: number; accepted: number; rejected: number }> = {};
    for (const c of cases || []) {
      if (!c.processedById) continue;
      if (!outMap[c.processedById]) outMap[c.processedById] = { total: 0, accepted: 0, rejected: 0 };
      outMap[c.processedById].total += 1;
      if (c.status === 'ACCEPTED') outMap[c.processedById].accepted += 1;
      if (c.status === 'REJECTED') outMap[c.processedById].rejected += 1;
    }

    return jsonResponse({ data: outMap });
  }

  // GET /compare
  if (req.method === 'GET' && pathname === '/compare') {
    return jsonResponse({
      data: {
        currentPeriod: { totalCases: 0, revenue: 0 },
        previousPeriod: { totalCases: 0, revenue: 0 },
        growthPercentage: 0,
      },
    });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});
