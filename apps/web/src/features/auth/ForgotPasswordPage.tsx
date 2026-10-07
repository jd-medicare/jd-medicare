import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { errorMessage } from '../../services/api-client';
import { AuthLayout, TextField } from '../../design-system';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setBusy(true); setError('');
    try { await authService.passwordForgot(email.trim()); setSent(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return (
    <AuthLayout>
      <form className="card" onSubmit={submit} noValidate>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <img src="/logo.png" alt="Himayat Associates" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'contain', background: '#fff' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg, #0f172a)' }}>Himayat Associates</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 22 }}>Reset your password</h1>
        {sent ? <p role="status">If an account exists for that email, a reset link has been sent. Check your inbox.</p> : (<>
          <TextField label="Email" type="email" autoComplete="username" required value={email} onChange={setEmail} />
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={busy}>Send reset link</button>
        </>)}
        <p style={{ marginBottom: 0 }}><Link to="/login">Back to sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
