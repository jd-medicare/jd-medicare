// supabase/functions/files/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/errors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/db.ts';

const BUCKET_NAME = 'attachments';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/files\/?/, '/');
  const client = getServiceClient();

  // POST /upload-url
  if (req.method === 'POST' && pathname === '/upload-url') {
    const body = await req.json().catch(() => ({}));
    const { fileName, mimeType, sizeBytes, entityType, entityId } = body;
    if (!fileName || !mimeType || !sizeBytes) {
      return errorResponse('VALIDATION_ERROR', 'fileName, mimeType, and sizeBytes are required');
    }

    const storageKey = `${user.organizationId}/${crypto.randomUUID()}-${fileName}`;

    // Create attachment record in DB
    const { data: attachment, error: dbError } = await client
      .from('attachments')
      .insert({
        organizationId: user.organizationId,
        uploadedById: user.id,
        storageKey,
        fileName,
        mimeType,
        sizeBytes,
        status: 'AVAILABLE',
        entityType,
        entityId,
        availableAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) return errorResponse('VALIDATION_ERROR', dbError.message);

    // Create signed upload URL from Supabase Storage
    const { data: uploadData, error: storageError } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storageKey);

    if (storageError) {
      return errorResponse('VALIDATION_ERROR', storageError.message);
    }

    // Log access
    await client.from('attachment_access_logs').insert({
      organizationId: user.organizationId,
      attachmentId: attachment.id,
      userId: user.id,
      action: 'UPLOAD_URL',
    });

    return jsonResponse({
      data: {
        attachmentId: attachment.id,
        uploadUrl: uploadData?.signedUrl,
        storageKey,
      },
    }, 201);
  }

  // GET /:id/download-url
  const dlMatch = pathname.match(/^\/([0-9a-fA-F-]+)\/download-url$/);
  if (req.method === 'GET' && dlMatch) {
    const attId = dlMatch[1];
    const { data: att, error } = await client
      .from('attachments')
      .select('*')
      .eq('id', attId)
      .eq('organizationId', user.organizationId)
      .single();

    if (error || !att) return errorResponse('NOT_FOUND', 'Attachment not found');

    const { data: signedData, error: sErr } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(att.storageKey, 3600);

    if (sErr || !signedData) return errorResponse('VALIDATION_ERROR', sErr?.message || 'Failed to sign URL');

    await client.from('attachment_access_logs').insert({
      organizationId: user.organizationId,
      attachmentId: att.id,
      userId: user.id,
      action: 'DOWNLOAD_URL',
    });

    return jsonResponse({
      data: {
        downloadUrl: signedData.signedUrl,
        expiresIn: 3600,
        fileName: att.fileName,
      },
    });
  }

  return errorResponse('NOT_FOUND', `Route not found: ${req.method} ${pathname}`);
});
