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
    // RBAC: Allowed: Team Leader, Admin, Primary Super Admin. Denied: Outsource, regular Agent, read-only.
    const isSuper = Boolean(
      user.isPrimarySuperAdmin ||
      user.roleKey === 'PRIMARY_SUPER_ADMIN' ||
      user.roleKey === 'SUPER_ADMIN' ||
      user.roleKey === 'ADMIN' ||
      user.roleKey.includes('ADMIN')
    );
    const isTeamLeader = Boolean(user.roleKey === 'TEAM_LEADER' || user.roleKey.includes('TEAM_LEADER'));
    const canEdit = (isSuper || isTeamLeader) && user.roleKey !== 'AGENT' && user.roleKey !== 'OUTSOURCE';

    if (!canEdit) {
      return errorResponse('FORBIDDEN', 'Only Team Leaders and Administrators have permission to edit customer details.');
    }

    const body = await req.json().catch(() => ({}));

    // Resolve target customer (id could be customerId or caseId)
    let actualCustomerId = customerId;
    const { data: directCust } = await client
      .from('customers')
      .select('id, phone, extra, address')
      .eq('id', customerId)
      .eq('organizationId', user.organizationId)
      .maybeSingle();

    if (!directCust) {
      const { data: caseRow } = await client
        .from('cases')
        .select('customerId')
        .eq('id', customerId)
        .eq('organizationId', user.organizationId)
        .maybeSingle();
      if (caseRow?.customerId) {
        actualCustomerId = caseRow.customerId;
      } else {
        return errorResponse('NOT_FOUND', 'Customer not found');
      }
    }

    // Validate and check duplicate phone if phone is updated
    if (body.phone) {
      const cleanPhone = String(body.phone).trim();
      const digits = cleanPhone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        return errorResponse('VALIDATION_ERROR', 'Phone number must contain between 7 and 15 digits.');
      }

      const { data: existingPhone } = await client
        .from('customers')
        .select('id')
        .eq('organizationId', user.organizationId)
        .eq('phone', cleanPhone)
        .neq('id', actualCustomerId)
        .maybeSingle();

      if (existingPhone) {
        return errorResponse('PHONE_ALREADY_EXISTS', 'A customer with this phone number already exists.');
      }
    }

    // Validate ZIP code if updated
    if (body.zipCode !== undefined) {
      const zip = String(body.zipCode).trim();
      if (zip && zip.length > 20) {
        return errorResponse('VALIDATION_ERROR', 'ZIP Code must not exceed 20 characters.');
      }
    }

    // Prepare customer updates
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (body.firstName !== undefined) updates.firstName = String(body.firstName).trim();
    if (body.lastName !== undefined) updates.lastName = String(body.lastName).trim();
    if (body.phone !== undefined) updates.phone = String(body.phone).trim();
    if (body.dateOfBirth !== undefined) updates.dateOfBirth = body.dateOfBirth ? String(body.dateOfBirth).trim() : null;
    if (body.zipCode !== undefined) updates.zipCode = String(body.zipCode).trim();

    // State handling
    if (body.state !== undefined) {
      updates.address = String(body.state).trim();
    } else if (body.address !== undefined) {
      updates.address = String(body.address).trim();
    }

    // Extra fields: ssnMbi, age, state
    const currentExtra = (directCust?.extra as Record<string, any>) || {};
    const updatedExtra: Record<string, any> = {
      ...currentExtra,
      ...(body.extra || {}),
    };
    if (body.ssnMbi !== undefined) updatedExtra.ssnMbi = body.ssnMbi ? String(body.ssnMbi).trim() : '';
    if (body.age !== undefined) updatedExtra.age = body.age !== '' && body.age !== null ? Number(body.age) : null;
    if (body.state !== undefined) updatedExtra.state = String(body.state).trim();

    updates.extra = updatedExtra;

    let { data: updatedCustomer, error: updateError } = await client
      .from('customers')
      .update(updates)
      .eq('id', actualCustomerId)
      .select()
      .maybeSingle();

    if (!updatedCustomer && !updateError) {
      const { data: custFallback } = await client
        .from('customers')
        .select('*')
        .eq('id', actualCustomerId)
        .maybeSingle();
      updatedCustomer = custFallback || { id: actualCustomerId, ...updates };
    }

    if (updateError) return errorResponse('VALIDATION_ERROR', updateError.message);

    // Update case assignments (Assigned Agent, Team Leader) if provided
    const caseUpdates: Record<string, any> = {};
    if (body.agentId !== undefined && body.agentId) caseUpdates.agentId = body.agentId;
    if (body.teamLeaderId !== undefined) caseUpdates.teamLeaderId = body.teamLeaderId || null;

    let updatedCase = null;
    if (Object.keys(caseUpdates).length > 0) {
      caseUpdates.updatedAt = new Date().toISOString();
      const { data: cData } = await client
        .from('cases')
        .update(caseUpdates)
        .eq('customerId', actualCustomerId)
        .eq('organizationId', user.organizationId)
        .select(`
          id, customerId, status, agentId, teamLeaderId,
          agent:agentId(id, fullName),
          teamLeader:teamLeaderId(id, fullName)
        `)
        .maybeSingle();
      updatedCase = cData;
    }

    // Update call length if provided
    if (body.durationSeconds !== undefined && body.durationSeconds !== null && body.durationSeconds !== '') {
      const dur = parseInt(String(body.durationSeconds), 10);
      if (!isNaN(dur) && dur >= 0) {
        const { data: caseRow } = await client
          .from('cases')
          .select('id')
          .eq('customerId', actualCustomerId)
          .eq('organizationId', user.organizationId)
          .maybeSingle();

        if (caseRow?.id) {
          await client
            .from('call_records')
            .upsert({
              organizationId: user.organizationId,
              caseId: caseRow.id,
              durationSeconds: dur,
              setById: user.id,
              updatedAt: new Date().toISOString(),
            }, { onConflict: 'caseId' });
        }
      }
    }

    return jsonResponse({
      data: {
        customer: updatedCustomer,
        case: updatedCase,
      },
    });
  }

  return errorResponse('NOT_FOUND', `Method ${req.method} not supported`);
});
