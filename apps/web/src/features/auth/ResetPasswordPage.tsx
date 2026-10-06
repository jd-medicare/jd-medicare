import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth';
import { errorMessage } from '../../services/api-client';
import { TextField } from '../../design-system';

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const [pw, setPw] = useState(''); const [again, setAgain] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!pw) { setError('Enter a new password.'); return; }
    if (pw !== again) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try { await authService.passwordReset(token, pw); setDone(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <form className="card" onSubmit={submit} style={{ width: 'min(380px,100%)' }} noValidate>
        <h1 style={{ margin: 0, fontSize: 22 }}>Choose a new password</h1>
        {!token ? <p className="err" role="alert">This reset link is missing its token. Request a new link.</p>
          : done ? <p role="status">Your password was changed. You can now sign in.</p> : (<>
          <TextField label="New password" type="password" autoComplete="new-password" required value={pw} onChange={setPw} />
          <TextField label="Repeat new password" type="password" autoComplete="new-password" required value={again} onChange={setAgain} />
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={busy}>Change password</button>
        </>)}
        <p style={{ marginBottom: 0 }}>{!token ? <Link to="/forgot-password">Request a new link</Link> : <Link to="/login">Back to sign in</Link>}</p>
      </form>
    </main>
  );
}
