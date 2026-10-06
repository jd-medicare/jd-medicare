import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import { errorMessage } from '../../services/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [code, setCode] = useState(''); const [mfa, setMfa] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const nav = useNavigate(); const qc = useQueryClient();
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mfa) await authService.mfaVerify(code);
      else { const r = await authService.login({ email, password }); if (r.data.mfaRequired) { setMfa(true); return; } }
      await qc.invalidateQueries({ queryKey: ['session'] }); nav('/', { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <form className="card" onSubmit={submit} style={{ width: 'min(380px,100%)' }} noValidate>
        <h1 style={{ margin: 0, fontSize: 22 }}>{mfa ? 'Verify your sign-in' : 'Sign in'}</h1>
        {!mfa ? (<>
          <label>Email<input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        </>) : (
          <label>6-digit code<input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></label>
        )}
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={busy}>{mfa ? 'Verify code' : 'Sign in'}</button>
        {!mfa && <p style={{ marginBottom: 0 }}><Link to="/forgot-password">Forgot your password?</Link></p>}
      </form>
    </main>
  );
}
