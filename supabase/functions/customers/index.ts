// supabase/functions/customers/index.ts
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
  const pathname = url.pathname.replace(/^\/customers\/?/, '/');
  const client = getServiceClient();

  // GET / (list customers)
  if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
    const permErr = requirePermission(user, 'customer:view');
    if (permErr) return permErr;

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    let query = client
      .from('customers')
      .select('id, organizationId, firstName, lastName, phone, dateOfBirth, address, zipCode, extra, createdById, createdAt, updatedAt', { count: 'exact' })
      .eq('organizationId', user.organizationId)
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: false });

    const search = url.searchParams.get('search');
    if (search) {
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const phone = url.searchParams.get('phone');
    if (phone) {
      query = query.eq('phone', phone);
    }

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
  }

  // POST / (create customer + case)
  if (req.method === 'POST' && (pathname === '/' || pathname === '')) {
    const permErr = requirePermission(user, 'customer:create');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, phone, dateOfBirth, address, zipCode, extra } = body;
    if (!firstName || !lastName || !phone || !dateOfBirth || !address || !zipCode) {
      return errorResponse('VALIDATION_ERROR', 'All required customer fields must be provided');
    }

    // Check duplicate phone in organization
    const { data: existing } = await client
      .from('customers')
      .select('id')
      .eq('organizationId', user.organizationId)
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      return errorResponse('PHONE_ALREADY_EXISTS', 'A customer with this phone number already exists.');
    }

    // Insert customer
    const { data: customer, error: customerError } = await client
      .from('customers')
      .insert({
        organizationId: user.organizationId,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        address,
        zipCode,
        extra: extra || {},
        createdById: user.id,
      })
      .select()
      .single();

    if (customerError || !customer) {
      if (
        customerError?.code === '23505' ||
        customerError?.message?.includes('duplicate key') ||
        customerError?.message?.includes('customers_organizationId_phone_key')
      ) {
        return errorResponse('PHONE_ALREADY_EXISTS', 'A customer with this phone number already exists.');
      }
      return errorResponse('VALIDATION_ERROR', customerError?.message || 'Failed to create customer');
    }

    // Automatically create corresponding case in `cases` table
    const { data: createdCase } = await client
      .from('cases')
      .insert({
        organizationId: user.organizationId,
        customerId: customer.id,
        status: 'PENDING',
        version: 1,
        agentId: user.id,
        submittedAt: new Date().toISOString(),
      })
      .select(`
        id, organizationId, customerId, status, version, agentId, teamLeaderId, processedById,
        processedAt, rejectionReason, submittedAt, createdAt, updatedAt,
        agent:agentId(id, fullName)
      `)
      .maybeSingle();

    return jsonResponse({ data: { customer, case: createdCase } }, 201);
  }

  // Parse ID: /:id
  const match = pathname.match(/^\/([0-9a-fA-F-]+)$/);
  if (!match) return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
  const customerId = match[1];

  // GET /:id
  if (req.method === 'GET') {
    const permErr = requirePermission(user, 'customer:view');
    if (permErr) return permErr;

    const { data, error } = await client
      .from('customers')
      .select('*, case:cases(*)')
      .eq('id', customerId)
      .eq('organizationId', user.organizationId)
      .single();

    if (error || !data) return errorResponse('NOT_FOUND', 'Customer not found');
    return jsonResponse({ data });
  }

  // PATCH /:id
  if (req.method === 'PATCH') {
    const permErr = requirePermission(user, 'customer:update');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, any> = {};
    ['firstName', 'lastName', 'address', 'zipCode', 'extra'].forEach((k) => {
      if (body[k] !== undefined) updates[k] = body[k];
    });

    const { data, error } = await client
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .eq('organizationId', user.organizationId)
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data });
  }

  return errorResponse('NOT_FOUND', `Method ${req.method} not supported`);
});
