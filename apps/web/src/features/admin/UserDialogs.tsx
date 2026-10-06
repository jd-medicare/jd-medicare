import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROLE_KEYS } from '@shared/enums';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { Dialog, TextField } from '../../design-system';
import type { UserDto } from '../../schemas/domain';

const Actions = ({ onClose, busy, label, danger }: { onClose: () => void; busy: boolean; label: string; danger?: boolean }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
    <button type="button" className="btn" onClick={onClose}>Cancel</button>
    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>{label}</button>
  </div>);

export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ email: '', fullName: '', phone: '', roleKey: 'AGENT', password: '' }); const [err, setErr] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => adminService.createUser({ email: f.email.trim(), fullName: f.fullName.trim(), roleKey: f.roleKey, phone: f.phone.trim() || undefined, password: f.password || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setF({ email: '', fullName: '', phone: '', roleKey: 'AGENT', password: '' }); onClose(); },
  });
  useEffect(() => { if (open) { m.reset(); setErr({}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e: FormEvent) {
    e.preventDefault(); const x: Record<string, string> = {};
    if (!f.fullName.trim()) x.fullName = 'Full name is required.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) x.email = 'Enter a valid email address.';
    setErr(x); if (!Object.keys(x).length) m.mutate();
  }
  return (
    <Dialog open={open} title="Create user" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <TextField label="Full name" required value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} error={err.fullName} />
        <TextField label="Email" type="email" required value={f.email} onChange={(v) => setF({ ...f, email: v })} error={err.email} />
        <TextField label="Phone (optional)" type="tel" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
        <label htmlFor="new-user-role">Role</label>
        <select id="new-user-role" className="input" value={f.roleKey} onChange={(e) => setF({ ...f, roleKey: e.target.value })}>
          {ROLE_KEYS.filter((r) => r !== 'PRIMARY_SUPER_ADMIN').map((r) => <option key={r} value={r}>{r}</option>)}</select>
        <TextField label="Initial password (optional)" type="password" autoComplete="new-password" value={f.password} onChange={(v) => setF({ ...f, password: v })} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} label="Create user" />
      </form>
    </Dialog>
  );
}

export function ReasonDialog({ target, onClose }: { target: { u: UserDto; kind: 'lock' | 'unlock' } | null; onClose: () => void }) {
  const [reason, setReason] = useState(''); const qc = useQueryClient();
  useEffect(() => setReason(''), [target]);
  const m = useMutation({
    mutationFn: () => (target!.kind === 'lock' ? adminService.lock : adminService.unlock)(target!.u.id, reason.trim() || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });
  useEffect(() => { m.reset(); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const lock = target?.kind === 'lock';
  return (
    <Dialog open={!!target} title={lock ? 'Lock this account' : 'Unlock this account'} onClose={onClose}>
      {target && <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <p>{target.u.fullName} ({target.u.email}) {lock ? 'will be unable to sign in until unlocked.' : 'will be able to sign in again.'}</p>
        <TextField label="Reason (optional)" value={reason} onChange={setReason} autoComplete="off" />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} label={lock ? 'Lock account' : 'Unlock account'} danger={lock} />
      </form>}
    </Dialog>
  );
}

export function PermissionsDialog({ target, onClose }: { target: UserDto | null; onClose: () => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set()); const qc = useQueryClient();
  const list = useQuery({ queryKey: ['permissions'], queryFn: () => adminService.permissions(), enabled: !!target });
  useEffect(() => setSel(new Set(target?.permissions ?? [])), [target]);
  const m = useMutation({
    mutationFn: () => adminService.setPermissions(target!.id, [...sel].sort()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });
  useEffect(() => { m.reset(); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k: string) => { const n = new Set(sel); if (n.has(k)) n.delete(k); else n.add(k); setSel(n); };
  return (
    <Dialog open={!!target} title="Edit permissions" onClose={onClose}>
      {target && <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Permissions for {target.fullName}</legend>
          <div style={{ maxHeight: '45vh', overflow: 'auto', display: 'grid', gap: 4, marginTop: 8 }}>
            {list.isLoading && <div className="skeleton" style={{ height: 80 }} aria-busy="true" />}
            {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}
            {list.data?.data.map((p) => (
              <label key={p.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: 0 }}>
                <input type="checkbox" checked={sel.has(p.key)} onChange={() => toggle(p.key)} />
                <span><strong>{p.key}</strong><br /><span style={{ color: 'var(--secondary)' }}>{p.description}</span></span></label>))}
          </div>
        </fieldset>
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending || !list.data} label="Save permissions" />
      </form>}
    </Dialog>
  );
}
