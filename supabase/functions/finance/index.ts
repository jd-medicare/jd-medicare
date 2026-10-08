// supabase/functions/finance/index.ts
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
  const pathname = url.pathname.replace(/^\/finance\/?/, '/');
  const client = getServiceClient();

  // 1. Expense Heads
  if (pathname === '/expense-heads' || pathname.startsWith('/expense-heads/')) {
    if (req.method === 'GET' && pathname === '/expense-heads') {
      const permErr = requirePermission(user, 'finance:view');
      if (permErr) return permErr;

      const { data, error } = await client
        .from('expense_heads')
        .select('*')
        .eq('organizationId', user.organizationId)
        .order('name');

      if (error) return errorResponse('VALIDATION_ERROR', error.message);
      return jsonResponse({ data: data || [] });
    }

    if (req.method === 'POST' && pathname === '/expense-heads') {
      const permErr = requirePermission(user, 'expense_head:create');
      if (permErr) return permErr;

      const body = await req.json().catch(() => ({}));
      const name = (body.name || '').trim();
      if (!name) return errorResponse('VALIDATION_ERROR', 'name is required');

      const nameKey = name.toLowerCase();
      const { data, error } = await client
        .from('expense_heads')
        .insert({
          organizationId: user.organizationId,
          name,
          nameKey,
          isActive: body.isActive !== undefined ? body.isActive : true,
        })
        .select()
        .single();

      if (error) return errorResponse('VALIDATION_ERROR', error.message);
      return jsonResponse({ data }, 201);
    }

    const headMatch = pathname.match(/^\/expense-heads\/([0-9a-fA-F-]+)$/);
    if (req.method === 'PATCH' && headMatch) {
      const permErr = requirePermission(user, 'expense_head:update');
      if (permErr) return permErr;

      const headId = headMatch[1];
      const body = await req.json().catch(() => ({}));
      const updates: Record<string, any> = {};
      if (body.name) {
        updates.name = body.name.trim();
        updates.nameKey = body.name.trim().toLowerCase();
      }
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      const { data, error } = await client
        .from('expense_heads')
        .update(updates)
        .eq('id', headId)
        .eq('organizationId', user.organizationId)
        .select()
        .single();

      if (error) return errorResponse('VALIDATION_ERROR', error.message);
      return jsonResponse({ data });
    }
  }

  // 1b. Income Heads
  if (pathname === '/income-heads' || pathname.startsWith('/income-heads/')) {
    if (req.method === 'GET' && pathname === '/income-heads') {
      const permErr = requirePermission(user, 'finance:view');
      if (permErr) return permErr;

      const { data, error } = await client
        .from('income_heads')
        .select('*')
        .eq('organizationId', user.organizationId)
        .order('name');

      if (error) return errorResponse('VALIDATION_ERROR', error.message);
      return jsonResponse({ data: data || [] });
    }

    if (req.method === 'POST' && pathname === '/income-heads') {
      const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey.includes('ADMIN'));
      if (!isSuper) {
        const permErr = requirePermission(user, 'income:create');
        if (permErr) return permErr;
      }

      const body = await req.json().catch(() => ({}));
      const name = (body.name || '').trim();
      if (!name) return errorResponse('VALIDATION_ERROR', 'Income head name is required');

      const nameKey = name.toLowerCase();
      // Prevent duplicate category names
      const { data: existing } = await client
        .from('income_heads')
        .select('id')
        .eq('organizationId', user.organizationId)
        .eq('nameKey', nameKey)
        .maybeSingle();

      if (existing) {
        return errorResponse('VALIDATION_ERROR', 'An income head with this name already exists.');
      }

      const { data, error } = await client
        .from('income_heads')
        .insert({
          organizationId: user.organizationId,
          name,
          nameKey,
          isActive: body.isActive !== undefined ? body.isActive : true,
        })
        .select()
        .single();

      if (error) return errorResponse('VALIDATION_ERROR', error.message);
      return jsonResponse({ data }, 201);
    }

    const headMatch = pathname.match(/^\/income-heads\/([0-9a-fA-F-]+)$/);
    if (req.method === 'PATCH' && headMatch) {
      const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey.includes('ADMIN'));
      if (!isSuper) {
        const permErr = requirePermission(user, 'income:update');
        if (permErr) return permErr;
      }

      const headId = headMatch[1];
      const body = await req.json().catch(() => ({}));
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (body.name) {
        const cleanName = body.name.trim();
        updates.name = cleanName;
        updates.nameKey = cleanName.toLowerCase();
      }
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      const { data, error } = await client
        .from('income_heads')
        .update(updates)
        .eq('id', headId)
        .eq('organizationId', user.organizationId)
        .select()
        .single();

      if (error) return errorResponse('VALIDATION_ERROR', error.message);
      return jsonResponse({ data });
    }
  }

  // 2. Incomes
  if (pathname === '/income' || pathname.startsWith('/income/')) {
    if (req.method === 'GET' && pathname === '/income') {
      const permErr = requirePermission(user, 'finance:view');
      if (permErr) return permErr;

      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25')));
      const offset = (page - 1) * limit;

      let query = client
        .from('incomes')
        .select('*', { count: 'exact' })
        .eq('organizationId', user.organizationId)
        .range(offset, offset + limit - 1)
        .order('date', { ascending: false });

      const status = url.searchParams.get('status');
      if (status) query = query.eq('status', status);

      const dateFrom = url.searchParams.get('dateFrom');
      if (dateFrom) query = query.gte('date', dateFrom);

      const dateTo = url.searchParams.get('dateTo');
      if (dateTo) query = query.lte('date', dateTo);

      const incomeHeadId = url.searchParams.get('incomeHeadId');
      if (incomeHeadId) query = query.eq('incomeHeadId', incomeHeadId);

      const category = url.searchParams.get('category');
      if (category) query = query.eq('category', category);

      const search = url.searchParams.get('search');
      if (search) {
        query = query.or(`category.ilike.%${search}%,description.ilike.%${search}%,reference.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) return errorResponse('VALIDATION_ERROR', error.message);

      return jsonResponse({
        data: data || [],
        meta: { page, limit, total: count || 0, pageCount: Math.ceil((count || 0) / limit) },
      });
    }

    if (req.method === 'POST' && pathname === '/income') {
      const permErr = requirePermission(user, 'income:create');
      if (permErr) return permErr;

      const body = await req.json().catch(() => ({}));
      const { amount, currency, date, fromDate, toDate, incomeHeadId, reference, description, relatedCaseId } = body;
      let category = (body.category || '').trim();

      // Resolve category from incomeHeadId if not directly provided
      if (incomeHeadId && !category) {
        const { data: headRow } = await client
          .from('income_heads')
          .select('name')
          .eq('id', incomeHeadId)
          .eq('organizationId', user.organizationId)
          .maybeSingle();
        if (headRow?.name) {
          category = headRow.name;
        }
      }

      if (!category) {
        return errorResponse('VALIDATION_ERROR', 'A valid Income Head is required');
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return errorResponse('VALIDATION_ERROR', 'Amount must be a positive number');
      }

      // Validate date duration
      const effectiveDate = date || fromDate || new Date().toISOString().substring(0, 10);
      if (fromDate && toDate && fromDate > toDate) {
        return errorResponse('VALIDATION_ERROR', 'From Date cannot exceed To Date');
      }

      const { data: income, error } = await client
        .from('incomes')
        .insert({
          organizationId: user.organizationId,
          amount: numAmount,
          currency: currency || 'PKR',
          date: effectiveDate,
          fromDate: fromDate || effectiveDate,
          toDate: toDate || effectiveDate,
          incomeHeadId: incomeHeadId || null,
          category,
          reference: reference || null,
          description: description || null,
          relatedCaseId: relatedCaseId || null,
          createdById: user.id,
        })
        .select()
        .single();

      if (error) return errorResponse('VALIDATION_ERROR', error.message);

      // Ledger row
      await client.from('financial_transactions').insert({
        organizationId: user.organizationId,
        type: 'INCOME',
        incomeId: income.id,
        date,
        amount,
        currency: currency || 'PKR',
        category,
        reference,
        status: 'ACTIVE',
      });

      return jsonResponse({ data: income }, 201);
    }

    const incomeMatch = pathname.match(/^\/income\/([0-9a-fA-F-]+)(\/.*)?$/);
    if (incomeMatch) {
      const incId = incomeMatch[1];
      const sub = incomeMatch[2] || '';

      if (req.method === 'GET' && sub === '') {
        const permErr = requirePermission(user, 'finance:view');
        if (permErr) return permErr;

        const { data, error } = await client.from('incomes').select('*').eq('id', incId).eq('organizationId', user.organizationId).single();
        if (error || !data) return errorResponse('NOT_FOUND', 'Income not found');
        return jsonResponse({ data });
      }

      if (req.method === 'PATCH' && sub === '') {
        const permErr = requirePermission(user, 'income:update');
        if (permErr) return permErr;

        const body = await req.json().catch(() => ({}));
        const updates: Record<string, any> = {};
        ['category', 'reference', 'description'].forEach((k) => {
          if (body[k] !== undefined) updates[k] = body[k];
        });

        const { data, error } = await client.from('incomes').update(updates).eq('id', incId).eq('organizationId', user.organizationId).select().single();
        if (error) return errorResponse('VALIDATION_ERROR', error.message);
        return jsonResponse({ data });
      }

      if (req.method === 'POST' && sub === '/void') {
        const permErr = requirePermission(user, 'income:update');
        if (permErr) return permErr;

        const body = await req.json().catch(() => ({}));
        if (!body.reason) return errorResponse('VALIDATION_ERROR', 'Void reason is required');

        const now = new Date().toISOString();
        const { data, error } = await client
          .from('incomes')
          .update({
            status: 'VOIDED',
            voidReason: body.reason,
            voidedAt: now,
            voidedById: user.id,
          })
          .eq('id', incId)
          .eq('organizationId', user.organizationId)
          .select()
          .single();

        if (error) return errorResponse('VALIDATION_ERROR', error.message);

        await client.from('financial_transactions').update({ status: 'VOIDED' }).eq('incomeId', incId);
        return jsonResponse({ data });
      }
    }
  }

  // 3. Expenses
  if (pathname === '/expenses' || pathname.startsWith('/expenses/')) {
    if (req.method === 'GET' && pathname === '/expenses') {
      const permErr = requirePermission(user, 'finance:view');
      if (permErr) return permErr;

      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
      const offset = (page - 1) * limit;

      let query = client
        .from('expenses')
        .select('*, expenseHead:expense_heads(name)', { count: 'exact' })
        .eq('organizationId', user.organizationId)
        .range(offset, offset + limit - 1)
        .order('date', { ascending: false });

      const status = url.searchParams.get('status');
      if (status) query = query.eq('status', status);

      const { data, count, error } = await query;
      if (error) return errorResponse('VALIDATION_ERROR', error.message);

      return jsonResponse({
        data: data || [],
        meta: { page, limit, total: count || 0, pageCount: Math.ceil((count || 0) / limit) },
      });
    }

    if (req.method === 'POST' && pathname === '/expenses') {
      const permErr = requirePermission(user, 'expense:create');
      if (permErr) return permErr;

      const body = await req.json().catch(() => ({}));
      const { expenseHeadId, amount, currency, date, payee, reference, description } = body;
      if (!expenseHeadId || !amount || amount <= 0 || !date) {
        return errorResponse('VALIDATION_ERROR', 'expenseHeadId, amount, and date are required');
      }

      const { data: expHead } = await client.from('expense_heads').select('name').eq('id', expenseHeadId).single();

      const { data: expense, error } = await client
        .from('expenses')
        .insert({
          organizationId: user.organizationId,
          expenseHeadId,
          amount,
          currency: currency || 'PKR',
          date,
          payee,
          reference,
          description,
          createdById: user.id,
        })
        .select()
        .single();

      if (error) return errorResponse('VALIDATION_ERROR', error.message);

      await client.from('financial_transactions').insert({
        organizationId: user.organizationId,
        type: 'EXPENSE',
        expenseId: expense.id,
        date,
        amount,
        currency: currency || 'PKR',
        category: expHead?.name || 'Expense',
        reference,
        status: 'ACTIVE',
      });

      return jsonResponse({ data: expense }, 201);
    }

    const expMatch = pathname.match(/^\/expenses\/([0-9a-fA-F-]+)(\/.*)?$/);
    if (expMatch) {
      const expId = expMatch[1];
      const sub = expMatch[2] || '';

      if (req.method === 'GET' && sub === '') {
        const permErr = requirePermission(user, 'finance:view');
        if (permErr) return permErr;

        const { data, error } = await client.from('expenses').select('*, expenseHead:expense_heads(name)').eq('id', expId).eq('organizationId', user.organizationId).single();
        if (error || !data) return errorResponse('NOT_FOUND', 'Expense not found');
        return jsonResponse({ data });
      }

      if (req.method === 'PATCH' && sub === '') {
        const permErr = requirePermission(user, 'expense:update');
        if (permErr) return permErr;

        const body = await req.json().catch(() => ({}));
        const updates: Record<string, any> = {};
        ['payee', 'reference', 'description'].forEach((k) => {
          if (body[k] !== undefined) updates[k] = body[k];
        });

        const { data, error } = await client.from('expenses').update(updates).eq('id', expId).eq('organizationId', user.organizationId).select().single();
        if (error) return errorResponse('VALIDATION_ERROR', error.message);
        return jsonResponse({ data });
      }

      if (req.method === 'POST' && sub === '/void') {
        const permErr = requirePermission(user, 'expense:update');
        if (permErr) return permErr;

        const body = await req.json().catch(() => ({}));
        if (!body.reason) return errorResponse('VALIDATION_ERROR', 'Void reason is required');

        const now = new Date().toISOString();
        const { data, error } = await client
          .from('expenses')
          .update({
            status: 'VOIDED',
            voidReason: body.reason,
            voidedAt: now,
            voidedById: user.id,
          })
          .eq('id', expId)
          .eq('organizationId', user.organizationId)
          .select()
          .single();

        if (error) return errorResponse('VALIDATION_ERROR', error.message);
        await client.from('financial_transactions').update({ status: 'VOIDED' }).eq('expenseId', expId);
        return jsonResponse({ data });
      }
    }
  }

  // 4. Ledger transactions
  if (req.method === 'GET' && pathname === '/transactions') {
    const permErr = requirePermission(user, 'finance:view');
    if (permErr) return permErr;

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    const { data, count, error } = await client
      .from('financial_transactions')
      .select('*', { count: 'exact' })
      .eq('organizationId', user.organizationId)
      .range(offset, offset + limit - 1)
      .order('date', { ascending: false });

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({
      data: data || [],
      meta: { page, limit, total: count || 0, pageCount: Math.ceil((count || 0) / limit) },
    });
  }

  // 5. Financial reports summary / by-category / monthly
  if (req.method === 'GET' && pathname.startsWith('/reports/')) {
    const permErr = requirePermission(user, 'finance:view');
    if (permErr) return permErr;

    if (pathname === '/reports/summary') {
      const { data: incomes } = await client.from('incomes').select('amount').eq('organizationId', user.organizationId).eq('status', 'ACTIVE');
      const { data: expenses } = await client.from('expenses').select('amount').eq('organizationId', user.organizationId).eq('status', 'ACTIVE');

      const totalIncome = (incomes || []).reduce((acc: number, cur: any) => acc + Number(cur.amount), 0);
      const totalExpense = (expenses || []).reduce((acc: number, cur: any) => acc + Number(cur.amount), 0);

      return jsonResponse({
        data: {
          totalIncome,
          totalExpense,
          netProfit: totalIncome - totalExpense,
        },
      });
    }

    if (pathname === '/reports/by-category') {
      const { data: txs } = await client.from('financial_transactions').select('category, type, amount').eq('organizationId', user.organizationId).eq('status', 'ACTIVE');
      const categoryMap: Record<string, { income: number; expense: number }> = {};
      for (const t of txs || []) {
        if (!categoryMap[t.category]) categoryMap[t.category] = { income: 0, expense: 0 };
        if (t.type === 'INCOME') categoryMap[t.category].income += Number(t.amount);
        else categoryMap[t.category].expense += Number(t.amount);
      }
      return jsonResponse({ data: categoryMap });
    }

    if (pathname === '/reports/monthly') {
      const { data: txs } = await client.from('financial_transactions').select('date, type, amount').eq('organizationId', user.organizationId).eq('status', 'ACTIVE');
      const monthlyMap: Record<string, { income: number; expense: number }> = {};
      for (const t of txs || []) {
        const month = String(t.date).slice(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
        if (t.type === 'INCOME') monthlyMap[month].income += Number(t.amount);
        else monthlyMap[month].expense += Number(t.amount);
      }
      return jsonResponse({ data: monthlyMap });
    }
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});
