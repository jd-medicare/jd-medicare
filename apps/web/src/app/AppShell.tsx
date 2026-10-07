import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { api, errorMessage } from '../services/api-client';
import type { SessionUserDto } from '../schemas';
import { Dialog, ThemeSwitcher } from '../design-system';
import { Icon, iconForPath } from './icons';
import { navFor } from './nav';

const label = (k: string) => k.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

export function AppShell({ user, children }: { user: SessionUserDto; children: ReactNode }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  // Whatever the server says, the local session is dropped: a failed logout usually means it already ended.
  const out = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      api.resetCsrf();
      qc.clear();
      nav('/login', { replace: true });
    },
  });
  const close = () => setOpen(false);

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn" aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Himayat Associates" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain', background: '#fff' }} />
          <strong>Himayat Associates</strong>
        </div>
      </div>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={close} aria-hidden="true" />
      <aside id="sidebar" className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Himayat Associates" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'contain', background: '#fff' }} />
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Himayat Associates</span>
        </div>
        <nav aria-label="Main" className="nav">
          {navFor(user).map((n) => (
            <NavLink key={n.path} to={n.path} onClick={close} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Icon name={iconForPath(n.path)} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <ThemeSwitcher />
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {user.fullName.trim().charAt(0).toUpperCase() || '?'}
            </span>
            <span>
              <b>{user.fullName}</b>
              <small>{label(user.roleKey)}</small>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
              onClick={() => setChangePwOpen(true)}
            >
              Change password
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: '6px 10px' }}
              onClick={() => out.mutate()}
              disabled={out.isPending}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="content">{children}</div>

      {/* Change Password Dialog (Old password then new password) */}
      <ChangePasswordDialog open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </div>
  );
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const m = useMutation({
    mutationFn: async () => {
      setErr('');
      if (!oldPassword) throw new Error('Current password is required');
      if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');
      if (newPassword !== confirmPassword) throw new Error('New password and confirmation do not match');
      return authService.changePassword(oldPassword, newPassword);
    },
    onSuccess: () => {
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  function handleClose() {
    setErr('');
    setSuccess(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  }

  return (
    <Dialog open={open} title="Change password" onClose={handleClose}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: 'var(--success, #16a34a)', fontWeight: 600, fontSize: 16 }}>
            ✓ Password updated successfully!
          </p>
          <p style={{ color: 'var(--muted, #94a3b8)', fontSize: 13 }}>
            Your account is now updated with your new password.
          </p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleClose}>
            Done
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          style={{ display: 'grid', gap: 12 }}
        >
          <div>
            <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Current (old) password *</label>
            <input
              className="input"
              type="password"
              required
              style={{ width: '100%', height: 40 }}
              placeholder="Enter current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>New password *</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              style={{ width: '100%', height: 40 }}
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Confirm new password *</label>
            <input
              className="input"
              type="password"
              required
              style={{ width: '100%', height: 40 }}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {err && <p className="err" role="alert">{err}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={m.isPending}>
              {m.isPending ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
