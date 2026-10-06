import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { EXPORT_FORMATS } from '@shared/enums';
import { reportService } from '../../services/reports';
import { errorMessage } from '../../services/api-client';

// Only follow links the server returns if they are absolute http(s) or same-origin paths.
const safeUrl = (u: string) => /^(https?:\/\/|\/)/.test(u);

export default function ExportPanel({ reportType, filters }: { reportType: string; filters: Record<string, string> }) {
  const [format, setFormat] = useState('CSV'); const [id, setId] = useState<string | null>(null);
  const create = useMutation({ mutationFn: () => reportService.createExport({ reportType, format, filters }), onSuccess: (r) => setId(r.data.id) });
  const poll = useQuery({
    queryKey: ['export', id], enabled: !!id, queryFn: () => reportService.exportStatus(id!),
    refetchInterval: (q) => { const s = q.state.data?.data.status; return q.state.status === 'error' || s === 'READY' || s === 'FAILED' ? false : 2000; },
  });
  const e = poll.data?.data;
  return (
    <section className="card" aria-label="Export report" style={{ display: 'grid', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Export</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ margin: 0 }}>Format<select className="input" value={format} onChange={(ev) => setFormat(ev.target.value)}>{EXPORT_FORMATS.map((f) => <option key={f}>{f}</option>)}</select></label>
        <button className="btn btn-primary" disabled={create.isPending || (!!id && !!e && (e.status === 'QUEUED' || e.status === 'RUNNING'))} onClick={() => { setId(null); create.mutate(); }}>Request export</button>
      </div>
      <div role="status" aria-live="polite">
        {create.isPending && 'Requesting export…'}
        {id && !e && !poll.isError && 'Waiting for export status…'}
        {e && (e.status === 'QUEUED' || e.status === 'RUNNING') && 'Your export is being prepared. This page checks every few seconds.'}
        {e?.status === 'READY' && (e.downloadUrl && safeUrl(e.downloadUrl) ? <>Export ready. <a href={e.downloadUrl} rel="noopener">Download file</a>{e.expiresAt ? ` (link expires ${new Date(e.expiresAt).toLocaleString()})` : ''}</> : 'Export is ready but has no download link. Request it again.')}
      </div>
      {e?.status === 'FAILED' && <p className="err" role="alert">The export failed. Try again.</p>}
      {create.isError && <p className="err" role="alert">{errorMessage(create.error)}</p>}
      {poll.isError && <p className="err" role="alert">{errorMessage(poll.error)}</p>}
    </section>
  );
}
