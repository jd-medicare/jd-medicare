import type { ReactNode } from 'react';
import { ThemeSwitcher } from './theme';

/** Split-screen layout shared by sign-in, forgot-password and reset-password. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-art" aria-hidden="true">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Himayat Associates" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'contain', background: '#fff' }} />
          <span style={{ fontSize: 22, fontWeight: 700 }}>Himayat Associates</span>
        </div>
        <div><h2>Every record, one clear workflow.</h2><p>Agents submit, team leaders review, outsource teams decide, and leadership sees it all in real time.</p></div>
        <small style={{ opacity: .7 }}>Secure, audited, role-based access.</small>
      </aside>
      <main className="auth-main">
        <ThemeSwitcher className="auth-theme" />
        {children}
      </main>
    </div>
  );
}
