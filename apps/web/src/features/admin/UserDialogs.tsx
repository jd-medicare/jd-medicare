import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_ROLE_MENUS, DEFAULT_ROLE_PERMISSIONS, MENUS, ROLE_KEYS, type RoleKey } from '@shared/enums';
import { getCustomMenus, getMenusForPermissions } from '../../app/nav';
import { adminService } from '../../services/admin';
import { authService } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { errorMessage } from '../../services/api-client';
import { recordAudit } from '../../services/audit';
import { notifyLiveSync } from '../../services/liveSync';
import { Dialog, TextField } from '../../design-system';
import type { UserDto } from '../../schemas/domain';

const Actions = ({ onClose, busy, label, danger }: { onClose: () => void; busy: boolean; label: string; danger?: boolean }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
    <button type="button" className="btn" onClick={onClose}>Cancel</button>
    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>{label}</button>
  </div>);

const nice = (k: string) => k.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

function getSavedPerms(userId: string): string[] | null {
  try {
    const raw = localStorage.getItem(`perms_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setSavedPerms(userId: string, perms: string[]) {
  try {
    localStorage.setItem(`perms_${userId}`, JSON.stringify(perms));
  } catch {}
}

function getSavedMenus(userId: string): string[] | null {
  try {
    const raw = localStorage.getItem(`menus_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setSavedMenus(userId: string, menus: string[]) {
  try {
    localStorage.setItem(`menus_${userId}`, JSON.stringify(menus));
  } catch {}
}

/** Role cards (live from roles.list, falling back to the built-in role keys). */
function RolePicker({ value, onChange, roles }: { value: string; onChange: (k: string) => void; roles: Array<{ key: string; name: string; permissions: string[]; menus: string[] }> }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '14px 0 0' }}>
      <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Role</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
        {roles.map((r) => (
          <label key={r.key} style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', border: `2px solid ${value === r.key ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: value === r.key ? 'var(--surface-muted)' : 'var(--surface)', cursor: 'pointer' }}>
            <input type="radio" name="role" value={r.key} checked={value === r.key} onChange={() => onChange(r.key)} />
            <span><strong>{r.name || nice(r.key)}</strong><br /><span className="hint">{r.permissions.length ? `${r.permissions.length} permissions` : nice(r.key)}</span></span>
          </label>))}
      </div>
    </fieldset>);
}

/** Menu picker with Dropdown + Quick Checkbox Pills + Presets */
function MenuPicker({
  all,
  value,
  onChange,
  onResetDefaults,
}: {
  all: string[];
  value: string[];
  onChange: (m: string[]) => void;
  onResetDefaults?: () => void;
}) {
  const normalizedValue = value.map((x) => x.toUpperCase());

  const toggle = (k: string) => {
    const key = k.toUpperCase();
    if (normalizedValue.includes(key)) {
      onChange(normalizedValue.filter((x) => x !== key));
    } else {
      onChange([...normalizedValue, key]);
    }
  };

  const handleSelectDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosen = e.target.value;
    if (!chosen) return;
    const key = chosen.toUpperCase();
    if (!normalizedValue.includes(key)) {
      onChange([...normalizedValue, key]);
    }
    e.target.value = '';
  };

  const selectAll = () => onChange(all.map((x) => x.toUpperCase()));
  const clearAll = () => onChange([]);

  return (
    <fieldset style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', margin: '14px 0 0', background: 'var(--surface-muted, rgba(0,0,0,0.02))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <legend style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
          Assign Menu Access ({normalizedValue.length} assigned)
        </legend>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={selectAll}>
            Select all
          </button>
          {onResetDefaults && (
            <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onResetDefaults}>
              Role defaults
            </button>
          )}
          <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={clearAll}>
            Clear
          </button>
        </div>
      </div>

      {/* Dropdown menu selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: 4 }}>
          Add menu from dropdown:
        </label>
        <select
          className="input"
          style={{ width: '100%', height: 38, borderRadius: 6, fontSize: 13 }}
          defaultValue=""
          onChange={handleSelectDropdown}
        >
          <option value="" disabled>
            — Select a menu to assign —
          </option>
          {all.map((k) => {
            const isAssigned = normalizedValue.includes(k.toUpperCase());
            return (
              <option key={k} value={k}>
                {nice(k)} {isAssigned ? '✓ (Assigned)' : '+ Add'}
              </option>
            );
          })}
        </select>
      </div>

      {/* Interactive toggle pills / checkboxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
        {all.map((k) => {
          const isChecked = normalizedValue.includes(k.toUpperCase());
          return (
            <label
              key={k}
              style={{
                margin: 0,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 6,
                border: `1px solid ${isChecked ? 'var(--primary, #3b82f6)' : 'var(--border)'}`,
                background: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface, #ffffff)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isChecked ? 600 : 400,
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(k)}
                style={{ accentColor: 'var(--primary, #3b82f6)' }}
              />
              <span>{nice(k)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Role and menu catalogs for the dialogs; fall back to the built-in lists if the server call fails or is not permitted. */
function useCatalog(enabled: boolean) {
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => adminService.roles(), enabled, staleTime: 60_000 });
  const menus = useQuery({ queryKey: ['menus'], queryFn: () => adminService.menus(), enabled, staleTime: 60_000 });
  const roleList = (roles.data?.data ?? ROLE_KEYS.map((k) => ({ key: k as string, name: nice(k), permissions: [] as string[], menus: [...DEFAULT_ROLE_MENUS[k]] as string[] })))
    .filter((r) => r.key !== 'PRIMARY_SUPER_ADMIN');

  const customKeys = getCustomMenus().map((c) => c.key.toUpperCase());
  const backendKeys = (menus.data?.data || []).map((m: any) => m.key?.toUpperCase()).filter(Boolean);
  const menuList = Array.from(new Set([...backendKeys, ...[...MENUS], ...customKeys]));

  const defaultsFor = (k: string) => {
    const fromRole = roleList.find((r) => r.key === k)?.menus;
    if (fromRole && fromRole.length > 0) return fromRole.map((x) => x.toUpperCase());
    return ((DEFAULT_ROLE_MENUS[k as RoleKey] || ['CUSTOMERS', 'CASES']) as readonly string[]).map((x) => x.toUpperCase());
  };

  return { roleList, menuList, defaultsFor, rawMenus: menus.data?.data, rawRoles: roles.data?.data };
}

export function CreateUserDialog({ open, onClose, canMenus = true }: { open: boolean; onClose: () => void; canMenus?: boolean }) {
  const blank = { email: '', fullName: '', phone: '', roleKey: 'AGENT', password: '' };
  const [f, setF] = useState(blank); const [err, setErr] = useState<Record<string, string>>({});
  const cat = useCatalog(open);
  const [menus, setMenus] = useState<string[]>([...DEFAULT_ROLE_MENUS.AGENT]);
  const [touched, setTouched] = useState(false);
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      const roleObj = cat.rawRoles?.find((r: any) => r.key === f.roleKey || r.id === f.roleKey);
      const roleKeyToSend = roleObj?.key || f.roleKey;
      const roleIdToSend = roleObj?.id;

      const finalMenus = menus && menus.length > 0 ? menus : cat.defaultsFor(f.roleKey);

      const res = await adminService.createUser({
        email: f.email.trim(),
        fullName: f.fullName.trim(),
        roleKey: roleKeyToSend,
        roleId: roleIdToSend,
        phone: f.phone.trim() || undefined,
        password: f.password || undefined,
        menus: finalMenus,
      });

      const newUserId = res?.data?.id;
      if (newUserId) {
        // Save menus in local cache immediately
        setSavedMenus(newUserId, finalMenus);

        // Also sync via setMenus
        try {
          const keyToId = new Map(cat.rawMenus?.map((m: any) => [m.key.toUpperCase(), m.id]) ?? []);
          const menuIds = finalMenus.map((k) => keyToId.get(k.toUpperCase()) || k);
          await adminService.setMenus(newUserId, finalMenus, menuIds);
        } catch (setErr) {
          console.warn('Set menus after user create notice:', setErr);
        }
      }

      return res;
    },
    onSuccess: (res) => {
      recordAudit('USER_CREATED', 'user', res?.data?.id || 'new-user', { fullName: f.fullName, email: f.email, role: f.roleKey });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-for-reports'] });
      qc.invalidateQueries({ queryKey: ['team-agents'] });
      notifyLiveSync('user-created');
      setF(blank);
      setTouched(false);
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      m.reset();
      setErr({});
      setTouched(false);
      setMenus(cat.defaultsFor(f.roleKey));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickRole = (k: string) => {
    setF({ ...f, roleKey: k });
    if (!touched) setMenus(cat.defaultsFor(k));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!f.fullName.trim()) x.fullName = 'Full name is required.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) x.email = 'Enter a valid email address.';
    setErr(x);
    if (!Object.keys(x).length) m.mutate();
  }

  return (
    <Dialog open={open} title="Create user" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <TextField label="Full name" required value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} error={err.fullName} />
        <TextField label="Email" type="email" required value={f.email} onChange={(v) => setF({ ...f, email: v })} error={err.email} />
        <TextField label="Phone (optional)" type="tel" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
        <RolePicker value={f.roleKey} onChange={pickRole} roles={cat.roleList} />
        {canMenus && (
          <MenuPicker
            all={cat.menuList}
            value={menus}
            onChange={(v) => {
              setTouched(true);
              setMenus(v);
            }}
            onResetDefaults={() => {
              setTouched(false);
              setMenus(cat.defaultsFor(f.roleKey));
            }}
          />
        )}
        <TextField label="Initial password (optional)" type="password" autoComplete="new-password" value={f.password} onChange={(v) => setF({ ...f, password: v })} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending} label="Create user" />
      </form>
    </Dialog>
  );
}

export function MenusDialog({ target, onClose }: { target: UserDto | null; onClose: () => void }) {
  const [sel, setSel] = useState<string[]>([]); const qc = useQueryClient(); const cat = useCatalog(!!target);
  useEffect(() => {
    if (!target) return;
    const cached = getSavedMenus(target.id);
    if (cached && cached.length > 0) {
      setSel(cached);
    } else if (target.menus && target.menus.length > 0) {
      setSel(target.menus);
    } else {
      setSel([...(cat.defaultsFor(target.roleKey) ?? [])]);
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const isPSA = Boolean(target?.isPrimarySuperAdmin || target?.roleKey === 'PRIMARY_SUPER_ADMIN');
  const m = useMutation({
    mutationFn: () => {
      const keyToId = new Map(cat.rawMenus?.map((m: any) => [m.key.toUpperCase(), m.id]) ?? []);
      const menuIds = sel.map((k) => keyToId.get(k.toUpperCase()) || k);
      return adminService.setMenus(target!.id, sel, menuIds);
    },
    onSuccess: () => {
      setSavedMenus(target!.id, sel);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['session'] });
      onClose();
    },
  });
  useEffect(() => { m.reset(); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={!!target} title="Menu access" onClose={onClose}>
      {target && <form onSubmit={(e) => { e.preventDefault(); if (!isPSA) m.mutate(); }}>
        <p style={{ margin: 0 }}>Pages {target.fullName} sees in the sidebar.</p>
        {isPSA && <p className="hint" style={{ marginTop: 8 }}>The Primary Super Admin has full built-in access to all menus and cannot have menu overrides.</p>}
        <MenuPicker
          all={cat.menuList}
          value={sel}
          onChange={setSel}
          onResetDefaults={() => setSel([...(cat.defaultsFor(target.roleKey) ?? [])])}
        />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending || isPSA} label="Save menus" />
      </form>}
    </Dialog>
  );
}

export function RoleDialog({ target, onClose }: { target: UserDto | null; onClose: () => void }) {
  const [role, setRole] = useState(''); const qc = useQueryClient(); const cat = useCatalog(!!target);
  useEffect(() => setRole(target?.roleKey ?? ''), [target]);
  const isPSA = Boolean(target?.isPrimarySuperAdmin || target?.roleKey === 'PRIMARY_SUPER_ADMIN');
  const m = useMutation({
    mutationFn: () => {
      const roleObj = cat.rawRoles?.find((r: any) => r.key === role || r.id === role);
      const roleId = roleObj?.id || role;
      return adminService.setRole(target!.id, role, roleId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });
  useEffect(() => { m.reset(); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={!!target} title="Change role" onClose={onClose}>
      {target && <form onSubmit={(e) => { e.preventDefault(); if (!isPSA) m.mutate(); }}>
        <p style={{ margin: 0 }}>Current role of {target.fullName}: <strong>{nice(target.roleKey)}</strong></p>
        {isPSA && <p className="hint" style={{ marginTop: 8 }}>The Primary Super Admin role cannot be changed.</p>}
        <RolePicker value={role} onChange={setRole} roles={cat.roleList} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending || role === target.roleKey || isPSA} label="Save role" />
      </form>}
    </Dialog>
  );
}

export function ReasonDialog({ target, onClose }: { target: { u: UserDto; kind: 'lock' | 'unlock' } | null; onClose: () => void }) {
  const [reason, setReason] = useState(''); const qc = useQueryClient();
  useEffect(() => setReason(''), [target]);
  const m = useMutation({
    mutationFn: () => (target!.kind === 'lock' ? adminService.lock : adminService.unlock)(target!.u.id, reason.trim() || undefined),
    onSuccess: () => {
      recordAudit(
        target!.kind === 'lock' ? 'USER_LOCKED' : 'USER_UNLOCKED',
        'user',
        target!.u.id,
        { fullName: target!.u.fullName, email: target!.u.email, reason: reason.trim() }
      );
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
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
  useEffect(() => {
    if (!target) return;
    const cached = getSavedPerms(target.id);
    if (cached && cached.length > 0) {
      setSel(new Set(cached));
    } else if (target.permissions && target.permissions.length > 0) {
      setSel(new Set(target.permissions));
    } else {
      const defaults = DEFAULT_ROLE_PERMISSIONS[target.roleKey as RoleKey] ?? [];
      setSel(new Set(defaults));
    }

    let cancelled = false;
    async function loadLatestDbPerms() {
      try {
        const { data: dbPerms } = await supabase
          .from('user_permissions')
          .select('permissions:permissionId(key)')
          .eq('userId', target!.id);
        if (!cancelled && dbPerms && dbPerms.length > 0) {
          const keys = dbPerms.map((p: any) => p.permissions?.key).filter(Boolean);
          if (keys.length > 0) {
            setSel(new Set(keys));
            setSavedPerms(target!.id, keys);
          }
        }
      } catch {}
    }
    loadLatestDbPerms();
    return () => { cancelled = true; };
  }, [target]);
  const isPSA = Boolean(target?.isPrimarySuperAdmin || target?.roleKey === 'PRIMARY_SUPER_ADMIN');
  const m = useMutation({
    mutationFn: async () => {
      const permKeys = [...sel].sort();
      const keyToId = new Map(list.data?.data.map((p) => [p.key, p.id]) ?? []);
      const permIds = permKeys.map((k) => keyToId.get(k) || k);

      // 1. Set permissions
      await adminService.setPermissions(target!.id, permKeys, permIds);

      // 2. Automatically sync menus corresponding to these permissions
      const inferredMenus = getMenusForPermissions(permKeys);
      const existingMenus = getSavedMenus(target!.id) || target!.menus || [];
      const mergedMenus = Array.from(new Set([...existingMenus, ...inferredMenus]));
      setSavedMenus(target!.id, mergedMenus);
      await adminService.setMenus(target!.id, mergedMenus).catch(() => null);

      return { success: true };
    },
    onSuccess: () => {
      recordAudit('PERMISSIONS_UPDATED', 'user', target!.id, {
        fullName: target!.fullName,
        permissionsCount: sel.size,
      });
      setSavedPerms(target!.id, [...sel].sort());
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['session'] });
      onClose();
    },
  });
  useEffect(() => { m.reset(); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k: string) => { const n = new Set(sel); if (n.has(k)) n.delete(k); else n.add(k); setSel(n); };
  return (
    <Dialog open={!!target} title="Edit permissions" onClose={onClose}>
      {target && <form onSubmit={(e) => { e.preventDefault(); if (!isPSA) m.mutate(); }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Permissions for {target.fullName}</legend>
          {isPSA && <p className="hint" style={{ marginTop: 8 }}>The Primary Super Admin automatically has all permissions and overrides are not permitted.</p>}
          <div style={{ maxHeight: '45vh', overflow: 'auto', display: 'grid', gap: 4, marginTop: 8 }}>
            {list.isLoading && <div className="skeleton" style={{ height: 80 }} aria-busy="true" />}
            {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}
            {list.data?.data.map((p) => (
              <label key={p.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: 0 }}>
                <input type="checkbox" checked={sel.has(p.key)} disabled={isPSA} onChange={() => toggle(p.key)} />
                <span><strong>{p.key}</strong><br /><span style={{ color: 'var(--secondary)' }}>{p.description}</span></span></label>))}
          </div>
        </fieldset>
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        <Actions onClose={onClose} busy={m.isPending || !list.data || isPSA} label="Save permissions" />
      </form>}
    </Dialog>
  );
}

export function ResetPasswordDialog({ target, onClose }: { target: UserDto | null; onClose: () => void }) {
  const [resetDone, setResetDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setResetDone(false); setBusy(false); setErr(''); }, [target]);

  async function handleReset() {
    if (!target) return;
    setBusy(true); setErr('');
    try {
      // Direct live update in database and Auth via RPC
      try {
        await supabase.rpc('set_user_password', {
          user_email: target.email,
          new_password: '000000',
        });
      } catch (rpcErr) {
        console.warn('RPC set_user_password note:', rpcErr);
      }

      await adminService.resetPassword(target.id, '000000', target.email).catch(() => {});

      await supabase.from('users').update({
        updatedAt: new Date().toISOString(),
        passwordHash: '000000',
      }).eq('id', target.id);

      // Save password reset locally to 000000 default without sending email
      localStorage.setItem(`reset_pwd_${target.email.toLowerCase().trim()}`, '000000');
      localStorage.setItem(`reset_pwd_${target.id}`, '000000');
      recordAudit('PASSWORD_RESET', 'user', target.id, {
        fullName: target.fullName,
        email: target.email,
        defaultPassword: '000000',
      });
      notifyLiveSync('password-reset');
      setResetDone(true);
    } catch (e: any) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!target} title="Reset user password" onClose={onClose}>
      {target && (
        <div>
          <p style={{ margin: '0 0 14px' }}>
            Reset password for <strong>{target.fullName}</strong> ({target.email}) to default: <code>000000</code>.
          </p>
          {resetDone ? (
            <div style={{ background: 'var(--surface-muted, rgba(34, 197, 94, 0.1))', padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, rgba(34, 197, 94, 0.3))', marginBottom: 16 }}>
              <p style={{ margin: 0, color: 'var(--success, #16a34a)', fontWeight: 600 }}>✓ Password reset to 000000 successfully!</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--secondary, #64748b)' }}>
                The user can now log in using the default password: <strong style={{ letterSpacing: 2, padding: '2px 6px', background: 'rgba(0,0,0,0.06)', borderRadius: 4 }}>000000</strong>. No email was sent.
              </p>
            </div>
          ) : (
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              <span>ℹ️ Clicking reset will immediately set this user's password to <strong>000000</strong> as default. No email will be sent.</span>
            </div>
          )}
          {err && <p className="err" role="alert">{err}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
            <button type="button" className="btn" onClick={onClose}>{resetDone ? 'Close' : 'Cancel'}</button>
            {!resetDone && (
              <button type="button" className="btn btn-primary" onClick={handleReset} disabled={busy}>
                {busy ? 'Resetting…' : 'Reset to default (000000)'}
              </button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function EditUserDialog({ target, onClose }: { target: UserDto | null; onClose: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  useEffect(() => {
    if (target) {
      setFullName(target.fullName || '');
      setEmail(target.email || '');
      setErr({});
    }
  }, [target]);

  const m = useMutation<any>({
    mutationFn: () => adminService.updateUser(target!.id, { fullName, email }),
    onSuccess: () => {
      recordAudit('USER_UPDATED', 'user', target!.id, {
        before: { fullName: target!.fullName, email: target!.email },
        after: { fullName, email },
      });
      qc.invalidateQueries({ queryKey: ['users'] });
      notifyLiveSync('user-updated');
      onClose();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!fullName.trim()) x.fullName = 'Full name is required.';
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) x.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) x.email = 'Please enter a valid email address.';
    setErr(x);
    if (!Object.keys(x).length) m.mutate();
  }

  return (
    <Dialog open={!!target} title="Edit user details" onClose={onClose}>
      {target && (
        <form onSubmit={submit} noValidate>
          <TextField
            label="Full name"
            required
            autoComplete="name"
            value={fullName}
            onChange={setFullName}
            error={err.fullName}
          />
          <TextField
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={err.email}
          />
          {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
          <Actions onClose={onClose} busy={m.isPending} label="Save Changes" />
        </form>
      )}
    </Dialog>
  );
}
