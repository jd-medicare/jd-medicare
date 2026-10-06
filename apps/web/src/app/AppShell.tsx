import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { api } from '../services/api-client';
import type { SessionUserDto } from '../schemas';
import { navFor } from './nav';

export function AppShell({ user, children }: { user: SessionUserDto; children: ReactNode }) {
  const nav = useNavigate(); const qc = useQueryClient();
  // Whatever the server says, the local session is dropped: a failed logout usually means it already ended.
  const out = useMutation({ mutationFn: () => authService.logout(), onSettled: () => { api.resetCsrf(); qc.clear(); nav('/login', { replace: true }); } });
  return (<>
    <header style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', padding: '8px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <nav aria-label="Main" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flex: 1 }}>
        {navFor(user).map((n) => (
          <NavLink key={n.path} to={n.path} style={({ isActive }) => ({ color: 'var(--foreground)', fontWeight: isActive ? 700 : 400, padding: '8px 0', textDecoration: isActive ? 'underline' : 'none' })}>{n.label}</NavLink>))}
      </nav>
      <span style={{ color: 'var(--secondary)' }}>{user.fullName}</span>
      <button className="btn" onClick={() => out.mutate()} disabled={out.isPending}>Sign out</button>
    </header>
    {children}
  </>);
}
