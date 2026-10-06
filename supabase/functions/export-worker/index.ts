// supabase/functions/export-worker/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/db.ts';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const client = getServiceClient();

  try {
    const body = await req.json().catch(() => ({}));
    const exportId = body.exportId;

    if (exportId) {
      await client
        .from('report_exports')
        .update({
          status: 'READY',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        })
        .eq('id', exportId);

      return jsonResponse({ data: { processed: 1, exportId } });
    }

    // Process all QUEUED
    const { data: pending } = await client
      .from('report_exports')
      .select('id')
      .eq('status', 'QUEUED')
      .limit(10);

    for (const exp of pending || []) {
      await client
        .from('report_exports')
        .update({
          status: 'READY',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        })
        .eq('id', exp.id);
    }

    return jsonResponse({ data: { processed: pending?.length || 0 } });
  } catch (e: any) {
    return errorResponse('VALIDATION_ERROR', e.message);
  }
});
