// supabase/functions/cases/index.ts
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
  const pathname = url.pathname.replace(/^\/cases\/?/, '/');
  const client = getServiceClient();

  // GET / (list cases)
  if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
    const permErr = requirePermission(user, 'case:view');
    if (permErr) return permErr;

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Ensure all customers in this organization have a corresponding case row
    const { data: missingCustomers } = await client
      .from('customers')
      .select('id, createdById, createdAt')
      .eq('organizationId', user.organizationId);

    if (missingCustomers && missingCustomers.length > 0) {
      const { data: existingCases } = await client
        .from('cases')
        .select('customerId')
        .eq('organizationId', user.organizationId);

      const existingCustIds = new Set((existingCases || []).map((c: any) => c.customerId));
      const toInsert = missingCustomers
        .filter((c: any) => !existingCustIds.has(c.id))
        .map((c: any) => ({
          organizationId: user.organizationId,
          customerId: c.id,
          status: 'PENDING',
          version: 1,
          agentId: c.createdById || user.id,
          submittedAt: c.createdAt || new Date().toISOString(),
        }));

      if (toInsert.length > 0) {
        await client.from('cases').insert(toInsert);
      }
    }

    let query = client
      .from('cases')
      .select(`
        id, organizationId, customerId, status, version, agentId, teamLeaderId, processedById,
        processedAt, rejectionReason, submittedAt, createdAt, updatedAt,
        customer:customers(id, firstName, lastName, phone, dateOfBirth, address, zipCode, extra),
        callRecord:call_records(durationSeconds),
        decision:accept_reject_actions(decision, reason, createdAt),
        agent:agentId(id, fullName)
      `, { count: 'exact' })
      .eq('organizationId', user.organizationId)
      .range(offset, offset + limit - 1)
      .order('submittedAt', { ascending: false });

    const status = url.searchParams.get('status');
    if (status) query = query.eq('status', status);

    const agentId = url.searchParams.get('agentId');
    if (agentId) query = query.eq('agentId', agentId);

    const teamLeaderId = url.searchParams.get('teamLeaderId');
    if (teamLeaderId) query = query.eq('teamLeaderId', teamLeaderId);

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

  // Parse ID routes: /:id, /:id/call-length, /:id/history, /:id/accept, /:id/reject, /:id/modify-processed
  const match = pathname.match(/^\/([0-9a-fA-F-]+)(\/.*)?$/);
  if (!match) return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
  const caseId = match[1];
  const subRoute = match[2] || '';

  // GET /:id
  if (req.method === 'GET' && subRoute === '') {
    const permErr = requirePermission(user, 'case:view');
    if (permErr) return permErr;

    const { data, error } = await client
      .from('cases')
      .select(`
        *,
        customer:customers(*),
        callRecord:call_records(*),
        decision:accept_reject_actions(*),
        assignments:case_assignments(*),
        transitions:workflow_transitions(*)
      `)
      .eq('id', caseId)
      .eq('organizationId', user.organizationId)
      .single();

    if (error || !data) return errorResponse('NOT_FOUND', 'Case not found');
    return jsonResponse({ data });
  }

  // GET /:id/history
  if (req.method === 'GET' && subRoute === '/history') {
    const permErr = requirePermission(user, 'case:view');
    if (permErr) return permErr;

    const { data, error } = await client
      .from('case_revisions')
      .select('*')
      .eq('caseId', caseId)
      .eq('organizationId', user.organizationId)
      .order('seq', { ascending: true });

    if (error) return errorResponse('VALIDATION_ERROR', error.message);
    return jsonResponse({ data: data || [] });
  }

  // PUT /:id/call-length
  if (req.method === 'PUT' && subRoute === '/call-length') {
    const permErr = requirePermission(user, 'call_length:create') || requirePermission(user, 'call_length:update');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const durationSeconds = parseInt(body.durationSeconds);
    if (isNaN(durationSeconds) || durationSeconds < 0) {
      return errorResponse('VALIDATION_ERROR', 'durationSeconds must be a non-negative integer');
    }

    const { data, error } = await client
      .from('call_records')
      .upsert({
        organizationId: user.organizationId,
        caseId,
        durationSeconds,
        setById: user.id,
      }, { onConflict: 'caseId' })
      .select()
      .single();

    if (error) return errorResponse('VALIDATION_ERROR', error.message);

    // Bump version and revision
    const { data: currentCase } = await client.from('cases').select('version').eq('id', caseId).single();
    const newVersion = (currentCase?.version || 1) + 1;
    await client.from('cases').update({ version: newVersion }).eq('id', caseId);

    await client.from('case_revisions').insert({
      organizationId: user.organizationId,
      caseId,
      type: 'CALL_LENGTH',
      actorId: user.id,
      versionAfter: newVersion,
      after: { durationSeconds },
    });

    return jsonResponse({ data });
  }

  // POST /:id/accept
  if (req.method === 'POST' && subRoute === '/accept') {
    const permErr = requirePermission(user, 'case:accept');
    if (permErr) return permErr;

    const { data: targetCase } = await client.from('cases').select('*').eq('id', caseId).eq('organizationId', user.organizationId).single();
    if (!targetCase) return errorResponse('NOT_FOUND', 'Case not found');
    if (targetCase.status === 'ACCEPTED' || targetCase.status === 'REJECTED') {
      return errorResponse('CASE_ALREADY_PROCESSED', 'Another user already processed this record.');
    }

    const newVersion = targetCase.version + 1;
    const now = new Date().toISOString();

    await client.from('cases').update({
      status: 'ACCEPTED',
      version: newVersion,
      processedById: user.id,
      processedAt: now,
    }).eq('id', caseId);

    await client.from('accept_reject_actions').insert({
      organizationId: user.organizationId,
      caseId,
      decision: 'ACCEPT',
      actorId: user.id,
    });

    await client.from('workflow_transitions').insert({
      organizationId: user.organizationId,
      caseId,
      fromStatus: targetCase.status,
      toStatus: 'ACCEPTED',
      action: 'ACCEPT',
      actorId: user.id,
    });

    await client.from('case_revisions').insert({
      organizationId: user.organizationId,
      caseId,
      type: 'ACCEPTED',
      actorId: user.id,
      versionAfter: newVersion,
    });

    return jsonResponse({ data: { success: true, status: 'ACCEPTED' } });
  }

  // POST /:id/reject
  if (req.method === 'POST' && subRoute === '/reject') {
    const permErr = requirePermission(user, 'case:reject');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || null;

    const { data: targetCase } = await client.from('cases').select('*').eq('id', caseId).eq('organizationId', user.organizationId).single();
    if (!targetCase) return errorResponse('NOT_FOUND', 'Case not found');
    if (targetCase.status === 'ACCEPTED' || targetCase.status === 'REJECTED') {
      return errorResponse('CASE_ALREADY_PROCESSED', 'Another user already processed this record.');
    }

    const newVersion = targetCase.version + 1;
    const now = new Date().toISOString();

    await client.from('cases').update({
      status: 'REJECTED',
      version: newVersion,
      processedById: user.id,
      processedAt: now,
      rejectionReason: reason,
    }).eq('id', caseId);

    await client.from('accept_reject_actions').insert({
      organizationId: user.organizationId,
      caseId,
      decision: 'REJECT',
      actorId: user.id,
      reason,
    });

    await client.from('workflow_transitions').insert({
      organizationId: user.organizationId,
      caseId,
      fromStatus: targetCase.status,
      toStatus: 'REJECTED',
      action: 'REJECT',
      actorId: user.id,
      reason,
    });

    await client.from('case_revisions').insert({
      organizationId: user.organizationId,
      caseId,
      type: 'REJECTED',
      actorId: user.id,
      reason,
      versionAfter: newVersion,
    });

    return jsonResponse({ data: { success: true, status: 'REJECTED' } });
  }

  // POST /:id/modify-processed
  if (req.method === 'POST' && subRoute === '/modify-processed') {
    const permErr = requirePermission(user, 'case:modify_processed');
    if (permErr) return permErr;

    const body = await req.json().catch(() => ({}));
    const { status, reason } = body;
    if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return errorResponse('VALIDATION_ERROR', 'Status must be ACCEPTED or REJECTED');
    }

    const { data: targetCase } = await client.from('cases').select('*').eq('id', caseId).eq('organizationId', user.organizationId).single();
    if (!targetCase) return errorResponse('NOT_FOUND', 'Case not found');

    const newVersion = targetCase.version + 1;
    await client.from('cases').update({
      status,
      version: newVersion,
      rejectionReason: status === 'REJECTED' ? reason : null,
    }).eq('id', caseId);

    await client.from('workflow_transitions').insert({
      organizationId: user.organizationId,
      caseId,
      fromStatus: targetCase.status,
      toStatus: status,
      action: 'MODIFY_PROCESSED',
      actorId: user.id,
      reason,
    });

    await client.from('case_revisions').insert({
      organizationId: user.organizationId,
      caseId,
      type: 'MODIFIED_AFTER_PROCESSING',
      actorId: user.id,
      reason,
      versionAfter: newVersion,
    });

    return jsonResponse({ data: { success: true, status } });
  }

  // PATCH /:id (Edit Case & Customer Details)
  if (req.method === 'PATCH' && subRoute === '') {
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

    const { data: targetCase } = await client
      .from('cases')
      .select('*, customer:customers(*)')
      .eq('id', caseId)
      .eq('organizationId', user.organizationId)
      .maybeSingle();

    if (!targetCase) return errorResponse('NOT_FOUND', 'Case not found');

    const body = await req.json().catch(() => ({}));
    const customerId = targetCase.customerId;

    // Validate and check duplicate phone if updated
    if (body.phone && body.phone !== targetCase.customer?.phone) {
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
        .neq('id', customerId)
        .maybeSingle();

      if (existingPhone) {
        return errorResponse('PHONE_ALREADY_EXISTS', 'A customer with this phone number already exists.');
      }
    }

    // Update customer table
    const custUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (body.firstName !== undefined) custUpdates.firstName = String(body.firstName).trim();
    if (body.lastName !== undefined) custUpdates.lastName = String(body.lastName).trim();
    if (body.phone !== undefined) custUpdates.phone = String(body.phone).trim();
    if (body.dateOfBirth !== undefined) custUpdates.dateOfBirth = body.dateOfBirth ? String(body.dateOfBirth).trim() : null;
    if (body.zipCode !== undefined) custUpdates.zipCode = String(body.zipCode).trim();
    if (body.state !== undefined) {
      custUpdates.address = String(body.state).trim();
    } else if (body.address !== undefined) {
      custUpdates.address = String(body.address).trim();
    }

    const currentExtra = (targetCase.customer?.extra as Record<string, any>) || {};
    const updatedExtra: Record<string, any> = { ...currentExtra, ...(body.extra || {}) };
    if (body.ssnMbi !== undefined) updatedExtra.ssnMbi = body.ssnMbi ? String(body.ssnMbi).trim() : '';
    if (body.age !== undefined) updatedExtra.age = body.age !== '' && body.age !== null ? Number(body.age) : null;
    if (body.state !== undefined) updatedExtra.state = String(body.state).trim();
    custUpdates.extra = updatedExtra;

    await client
      .from('customers')
      .update(custUpdates)
      .eq('id', customerId)
      .eq('organizationId', user.organizationId);

    // Update case table
    const caseUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (body.agentId !== undefined && body.agentId) caseUpdates.agentId = body.agentId;
    if (body.teamLeaderId !== undefined) caseUpdates.teamLeaderId = body.teamLeaderId || null;

    if (Object.keys(caseUpdates).length > 1) {
      await client
        .from('cases')
        .update(caseUpdates)
        .eq('id', caseId)
        .eq('organizationId', user.organizationId);
    }

    // Update call duration if provided
    if (body.durationSeconds !== undefined && body.durationSeconds !== null && body.durationSeconds !== '') {
      const dur = parseInt(String(body.durationSeconds), 10);
      if (!isNaN(dur) && dur >= 0) {
        await client
          .from('call_records')
          .upsert({
            organizationId: user.organizationId,
            caseId,
            durationSeconds: dur,
            setById: user.id,
            updatedAt: new Date().toISOString(),
          }, { onConflict: 'caseId' });
      }
    }

    // Fetch updated complete case
    const { data: updatedData } = await client
      .from('cases')
      .select(`
        *,
        customer:customers(*),
        callRecord:call_records(*),
        agent:agentId(id, fullName),
        teamLeader:teamLeaderId(id, fullName)
      `)
      .eq('id', caseId)
      .single();

    return jsonResponse({ data: updatedData || targetCase });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});

