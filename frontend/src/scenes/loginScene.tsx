import { useState } from 'react';
import { theme } from '../configs/theme';

interface LoginSceneProps {
  onLogin: () => void;
}

interface LoginResponse {
  requires2fa?: boolean;
  message?: string;
  error?: string;
}

export default function LoginScene({ onLogin }: LoginSceneProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [pending2fa, setPending2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: { username: string; password: string; totp?: string } = { username, password };
    if (pending2fa) payload.totp = totp;

    let res: Response;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    } catch {
      setError('Network error: cannot reach the server');
      setLoading(false);
      return;
    }

    let json: LoginResponse;
    try {
      json = await res.json() as LoginResponse;
    } catch {
      setError(`Server error (${res.status}): unexpected response`);
      setLoading(false);
      return;
    }

    if (json.requires2fa) {
      setPending2fa(true);
      setLoading(false);
      return;
    }

    if (res.ok) {
      onLogin();
    } else {
      setError(json?.message ?? json?.error ?? 'Login failed');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResendMsg('');
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resendEmail }),
    });
    const json = await res.json() as { message?: string };
    setResendMsg(json.message ?? 'Done');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(9, 23, 32, 0.8)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '4px',
    color: theme.colors.gold,
    fontFamily: theme.fonts.mono,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: theme.fonts.heading,
    fontSize: '12px',
    letterSpacing: '2px',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: '8px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.colors.bgDark,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '48px 40px',
          background: theme.colors.bgPanel,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: '28px',
              fontWeight: 700,
              color: theme.colors.gold,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              textShadow: `0 0 20px ${theme.colors.goldGlow}`,
              margin: 0,
            }}
          >
            Clash of Olympus
          </h1>
          <p
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: '11px',
              letterSpacing: '6px',
              color: theme.colors.textMuted,
              textTransform: 'uppercase',
              marginTop: '8px',
              marginBottom: 0,
            }}
          >
            Enter the arena
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              autoComplete="username"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              autoComplete="current-password"
              required
            />
          </div>

          {pending2fa && (
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>2FA Code</label>
              <input
                type="text"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                style={inputStyle}
                placeholder="Google Authenticator code"
                autoComplete="one-time-code"
              />
            </div>
          )}

          {error && (
            <p
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: '13px',
                color: theme.colors.dead,
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'transparent',
              border: `1px solid ${theme.colors.borderHover}`,
              borderRadius: '4px',
              color: theme.colors.gold,
              fontFamily: theme.fonts.heading,
              fontSize: '14px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Loading...' : pending2fa ? 'Verify' : 'Enter'}
          </button>
        </form>

        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <a
            href="/api/auth/google"
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              color: theme.colors.textSecondary,
              textDecoration: 'none',
              letterSpacing: '1px',
            }}
          >
            Login with Google
          </a>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a
              href="/register.html"
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: '12px',
                color: theme.colors.textMuted,
                textDecoration: 'none',
              }}
            >
              Register
            </a>
            <a
              href="/forgot-password.html"
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: '12px',
                color: theme.colors.textMuted,
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </a>
          </div>

          <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="Email for verification resend"
              style={{ ...inputStyle, fontSize: '12px', padding: '8px 12px' }}
            />
            <button
              type="button"
              onClick={handleResend}
              style={{
                padding: '8px',
                background: 'transparent',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                color: theme.colors.textMuted,
                fontFamily: theme.fonts.mono,
                fontSize: '11px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Resend verification
            </button>
            {resendMsg && (
              <p style={{ fontFamily: theme.fonts.mono, fontSize: '11px', color: theme.colors.textSecondary, textAlign: 'center', margin: 0 }}>
                {resendMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        input:focus {
          border-color: ${theme.colors.borderHover} !important;
          box-shadow: 0 0 8px ${theme.colors.goldGlow};
        }
        button:hover:not(:disabled) {
          background: ${theme.colors.goldSubtle} !important;
          box-shadow: 0 0 16px ${theme.colors.goldGlow};
        }
      `}</style>
    </div>
  );
}
