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
    const qRange = url.searchParams.get('range') || 'THIS_MONTH';
    const qFrom = url.searchParams.get('dateFrom');
    const qTo = url.searchParams.get('dateTo');

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
    const today = now.toISOString().substring(0, 10);

    const dateFrom = qFrom || firstDay;
    const dateTo = qTo || today;

    // Fetch cases
    const { data: cases } = await client
      .from('cases')
      .select('id, status, submittedAt, agentId, teamLeaderId, processedById, callRecord:call_records(durationSeconds)')
      .eq('organizationId', user.organizationId);

    // Fetch incomes
    const { data: incomes } = await client
      .from('incomes')
      .select('amount, date')
      .eq('organizationId', user.organizationId)
      .eq('status', 'ACTIVE');

    // Fetch expenses
    const { data: expenses } = await client
      .from('expenses')
      .select('amount, date')
      .eq('organizationId', user.organizationId)
      .eq('status', 'ACTIVE');

    // Fetch users for headcount
    const { data: users } = await client
      .from('users')
      .select('id, status, roles:roleId(key)')
      .eq('organizationId', user.organizationId)
      .eq('status', 'ACTIVE');

    const totalRecords = cases?.length || 0;
    const accepted = cases?.filter((c: any) => c.status === 'ACCEPTED').length || 0;
    const rejected = cases?.filter((c: any) => c.status === 'REJECTED').length || 0;
    const pending = cases?.filter((c: any) => c.status === 'PENDING' || c.status === 'SUBMITTED').length || 0;
    const newRecords = totalRecords;
    const processed = accepted + rejected;
    const processingRate = totalRecords > 0 ? Math.round((processed / totalRecords) * 100) : 0;
    const acceptanceRate = processed > 0 ? Math.round((accepted / processed) * 100) : 0;
    const rejectionRate = processed > 0 ? Math.round((rejected / processed) * 100) : 0;

    // Active people by role
    let activeAgents = 0;
    let activeTeamLeaders = 0;
    let activeOutsourceUsers = 0;
    for (const u of users || []) {
      const rk = (u.roles as any)?.key;
      if (rk === 'AGENT') activeAgents++;
      else if (rk === 'TEAM_LEADER') activeTeamLeaders++;
      else if (rk === 'OUTSOURCE') activeOutsourceUsers++;
    }

    // Call length
    const durations = (cases || []).map((c: any) => c.callRecord?.durationSeconds || 0);
    const totalSeconds = durations.reduce((a: number, b: number) => a + b, 0);
    const averageSeconds = totalRecords > 0 ? Math.round(totalSeconds / totalRecords) : 0;
    const minSeconds = durations.length > 0 ? Math.min(...durations) : 0;
    const maxSeconds = durations.length > 0 ? Math.max(...durations) : 0;

    // Finance sums
    const totalIncomeNum = (incomes || []).reduce((acc: number, cur: any) => acc + Number(cur.amount), 0);
    const totalExpenseNum = (expenses || []).reduce((acc: number, cur: any) => acc + Number(cur.amount), 0);
    const netPositionNum = totalIncomeNum - totalExpenseNum;

    // Trends: Records by date
    const dateBuckets: Record<string, { date: string; total: number; accepted: number; rejected: number; pending: number }> = {};
    for (const c of cases || []) {
      const d = c.submittedAt ? c.submittedAt.substring(0, 10) : today;
      if (!dateBuckets[d]) {
        dateBuckets[d] = { date: d, total: 0, accepted: 0, rejected: 0, pending: 0 };
      }
      dateBuckets[d].total += 1;
      if (c.status === 'ACCEPTED') dateBuckets[d].accepted += 1;
      else if (c.status === 'REJECTED') dateBuckets[d].rejected += 1;
      else dateBuckets[d].pending += 1;
    }

    // Trends: Income vs expense by month
    const monthBuckets: Record<string, { month: string; income: number; expenses: number }> = {};
    for (const inc of incomes || []) {
      const m = inc.date ? inc.date.substring(0, 7) : today.substring(0, 7);
      if (!monthBuckets[m]) monthBuckets[m] = { month: m, income: 0, expenses: 0 };
      monthBuckets[m].income += Number(inc.amount);
    }
    for (const exp of expenses || []) {
      const m = exp.date ? exp.date.substring(0, 7) : today.substring(0, 7);
      if (!monthBuckets[m]) monthBuckets[m] = { month: m, income: 0, expenses: 0 };
      monthBuckets[m].expenses += Number(exp.amount);
    }

    const recordsByDate = Object.values(dateBuckets).sort((a, b) => b.date.localeCompare(a.date));
    const incomeVsExpenseByMonth = Object.values(monthBuckets)
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((m) => ({
        month: m.month,
        income: String(m.income),
        expenses: String(m.expenses),
      }));

    return jsonResponse({
      data: {
        range: {
          dateFrom,
          dateTo,
        },
        operations: {
          totalRecords,
          newRecords,
          pending,
          accepted,
          rejected,
          processingRate,
          acceptanceRate,
          rejectionRate,
        },
        people: {
          activeAgents,
          activeTeamLeaders,
          activeOutsourceUsers,
        },
        callLength: {
          totalSeconds,
          averageSeconds,
          minSeconds,
          maxSeconds,
        },
        finance: {
          totalIncome: String(totalIncomeNum),
          totalExpenses: String(totalExpenseNum),
          netPosition: String(netPositionNum),
          currency: 'PKR',
        },
        trends: {
          recordsByDate,
          incomeVsExpenseByMonth,
        },
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
