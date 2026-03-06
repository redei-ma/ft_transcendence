import { useState, useEffect } from 'react';
import { theme } from '../configs/theme';

interface DashboardSceneProps {
  onBack: () => void;
  onLogout: () => void;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  status: string;
  createdAt: string;
  is2faEnabled: boolean;
}

interface CharacterStats {
  characterName: string;
  wins: number;
  losses: number;
  draws: number;
  kills: number;
  deaths: number;
}

interface UserStats {
  eloCurrent: number;
  eloPeak: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  currentWinStreak: number;
  bestWinStreak: number;
  currentLoseStreak: number;
  totalKills: number;
  totalDeaths: number;
  characterStats: CharacterStats[];
}

interface LeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  avatarUrl: string;
  eloCurrent: number;
  totalWins: number;
  totalLosses: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total: number;
}

interface MatchParticipant {
  userId: number | null;
  username: string | null;
  characterName: string;
  kills: number;
  deaths: number;
}

interface MatchEntry {
  matchId: number;
  playedAt: string;
  mode: string;
  type: string;
  durationSeconds: number;
  endReason: string | null;
  result: 'WIN' | 'LOSS' | 'DRAW';
  participants: MatchParticipant[];
}

interface MatchHistory {
  entries: MatchEntry[];
  total: number;
}

async function apiFetch<T>(url: string): Promise<T> {
  let res = await fetch(url, { credentials: 'include' });

  if (res.status === 401) {
    const refreshed = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshed.ok) {
      const err = new Error('401 Unauthorized') as Error & { is401: boolean };
      err.is401 = true;
      throw err;
    }
    res = await fetch(url, { credentials: 'include' });
  }

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body?: object): Promise<T> {
  const opts: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  };

  let res = await fetch(url, opts);

  if (res.status === 401) {
    const refreshed = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshed.ok) throw new Error('401 Unauthorized');
    res = await fetch(url, opts);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const cardStyle: React.CSSProperties = {
  background: theme.colors.bgPanel,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: theme.fonts.heading,
  fontSize: '12px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: theme.colors.textSecondary,
  marginBottom: '16px',
  paddingBottom: '8px',
  borderBottom: `1px solid ${theme.colors.border}`,
};

const statRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontFamily: theme.fonts.mono,
  fontSize: '13px',
  color: theme.colors.textPrimary,
  padding: '4px 0',
};

const statLabel: React.CSSProperties = {
  color: theme.colors.textSecondary,
};

function resultColor(result: 'WIN' | 'LOSS' | 'DRAW'): string {
  if (result === 'WIN') return theme.colors.hpHigh;
  if (result === 'LOSS') return theme.colors.dead;
  return theme.colors.afk;
}

export default function DashboardScene({ onBack, onLogout }: DashboardSceneProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [twoFaStep, setTwoFaStep] = useState<'idle' | 'qr' | 'confirm'>('idle');
  const [qrCode, setQrCode] = useState<string>('');
  const [totpCode, setTotpCode] = useState<string>('');
  const [twoFaMsg, setTwoFaMsg] = useState<string>('');

  useEffect(() => {
    const fetchAll = async () => {
      const [profileRes, statsRes, lbRes, matchRes] = await Promise.allSettled([
        apiFetch<UserProfile>('/api/users/me'),
        apiFetch<UserStats>('/api/users/me/stats'),
        apiFetch<LeaderboardData>('/api/users/leaderboard?limit=10'),
        apiFetch<MatchHistory>('/api/users/me/matches?limit=5'),
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (lbRes.status === 'fulfilled') setLeaderboard(lbRes.value);
      if (matchRes.status === 'fulfilled') setMatchHistory(matchRes.value);

      // If any auth request fails with 401 (refresh also failed), force logout
      const has401 = [profileRes, statsRes, matchRes].some(
        (r) => r.status === 'rejected' && (r.reason as { is401?: boolean }).is401 === true,
      );
      if (has401) { onLogout(); return; }

      setLoading(false);
    };
    void fetchAll();
  }, [onLogout]);

  const handleSetup2fa = async () => {
    setTwoFaMsg('');
    try {
      const data = await apiPost<{ qrCode: string }>('/api/auth/2fa/setup');
      setQrCode(data.qrCode);
      setTwoFaStep('qr');
    } catch (e) {
      setTwoFaMsg(e instanceof Error ? e.message : 'Setup failed');
    }
  };

  const handleEnable2fa = async () => {
    setTwoFaMsg('');
    try {
      await apiPost('/api/auth/2fa/enable', { code: totpCode });
      setProfile((prev) => prev ? { ...prev, is2faEnabled: true } : prev);
      setTwoFaStep('idle');
      setQrCode('');
      setTotpCode('');
      setTwoFaMsg('2FA enabled successfully.');
    } catch (e) {
      setTwoFaMsg(e instanceof Error ? e.message : 'Invalid code');
    }
  };

  const handleDisable2fa = async () => {
    setTwoFaMsg('');
    try {
      await apiPost('/api/auth/2fa/disable');
      setProfile((prev) => prev ? { ...prev, is2faEnabled: false } : prev);
      setTwoFaMsg('2FA disabled.');
    } catch (e) {
      setTwoFaMsg(e instanceof Error ? e.message : 'Disable failed');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.colors.bgDark,
        overflowY: 'auto',
        padding: '32px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            color: theme.colors.textSecondary,
            fontFamily: theme.fonts.mono,
            fontSize: '12px',
            padding: '8px 16px',
            cursor: 'pointer',
            letterSpacing: '2px',
          }}
        >
          &larr; BACK
        </button>
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '20px',
            fontWeight: 700,
            color: theme.colors.gold,
            letterSpacing: '6px',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Dashboard
        </h1>
      </div>

      {loading && (
        <p style={{ fontFamily: theme.fonts.mono, color: theme.colors.textMuted, textAlign: 'center' }}>
          Loading...
        </p>
      )}

      {!loading && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Profile + Stats — two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            {/* Profile */}
            {profile && (
              <div style={cardStyle}>
                <p style={sectionTitle}>Profile</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <img
                    src={profile.avatarUrl}
                    alt="avatar"
                    style={{ width: '56px', height: '56px', borderRadius: '50%', border: `1px solid ${theme.colors.border}` }}
                  />
                  <div>
                    <p style={{ fontFamily: theme.fonts.heading, fontSize: '16px', color: theme.colors.gold, margin: 0 }}>
                      {profile.username}
                    </p>
                    <p style={{ fontFamily: theme.fonts.mono, fontSize: '11px', color: theme.colors.textMuted, margin: '4px 0 0' }}>
                      {profile.email}
                    </p>
                  </div>
                </div>
                <div style={statRow}><span style={statLabel}>ID</span><span>#{profile.id}</span></div>
                <div style={statRow}><span style={statLabel}>Status</span><span>{profile.status}</span></div>
                <div style={statRow}>
                  <span style={statLabel}>Member since</span>
                  <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div style={cardStyle}>
                <p style={sectionTitle}>Statistics</p>
                <div style={statRow}><span style={statLabel}>ELO</span><span style={{ color: theme.colors.gold }}>{stats.eloCurrent}</span></div>
                <div style={statRow}><span style={statLabel}>Peak ELO</span><span>{stats.eloPeak}</span></div>
                <div style={statRow}><span style={statLabel}>Wins</span><span style={{ color: theme.colors.hpHigh }}>{stats.totalWins}</span></div>
                <div style={statRow}><span style={statLabel}>Losses</span><span style={{ color: theme.colors.dead }}>{stats.totalLosses}</span></div>
                <div style={statRow}><span style={statLabel}>Draws</span><span>{stats.totalDraws}</span></div>
                <div style={statRow}><span style={statLabel}>Win streak</span><span>{stats.currentWinStreak} (best {stats.bestWinStreak})</span></div>
                <div style={statRow}><span style={statLabel}>K / D</span><span>{stats.totalKills} / {stats.totalDeaths}</span></div>
                {stats.characterStats.map((cs) => (
                  <div key={cs.characterName} style={{ ...statRow, marginTop: '4px', borderTop: `1px solid ${theme.colors.border}`, paddingTop: '8px' }}>
                    <span style={statLabel}>{cs.characterName}</span>
                    <span>{cs.wins}W {cs.losses}L — {cs.kills}K/{cs.deaths}D</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security — 2FA */}
          {profile && (
            <div style={cardStyle}>
              <p style={sectionTitle}>Security</p>
              <div style={{ ...statRow, marginBottom: '16px' }}>
                <span style={statLabel}>Two-Factor Authentication</span>
                <span style={{ color: profile.is2faEnabled ? theme.colors.hpHigh : theme.colors.dead }}>
                  {profile.is2faEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {!profile.is2faEnabled && twoFaStep === 'idle' && (
                <button
                  onClick={() => { void handleSetup2fa(); }}
                  style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${theme.colors.border}`, borderRadius: '4px', color: theme.colors.textSecondary, fontFamily: theme.fonts.mono, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer' }}
                >
                  Enable 2FA
                </button>
              )}

              {twoFaStep === 'qr' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textSecondary, margin: 0 }}>
                    Scan this QR code with Google Authenticator, then enter the code below.
                  </p>
                  <img src={qrCode} alt="2FA QR Code" style={{ width: '160px', height: '160px', border: `1px solid ${theme.colors.border}`, borderRadius: '4px' }} />
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    style={{ padding: '8px 12px', background: 'rgba(9,23,32,0.8)', border: `1px solid ${theme.colors.border}`, borderRadius: '4px', color: theme.colors.gold, fontFamily: theme.fonts.mono, fontSize: '14px', width: '160px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { void handleEnable2fa(); }}
                      style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${theme.colors.borderHover}`, borderRadius: '4px', color: theme.colors.gold, fontFamily: theme.fonts.mono, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer' }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setTwoFaStep('idle'); setQrCode(''); setTotpCode(''); setTwoFaMsg(''); }}
                      style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${theme.colors.border}`, borderRadius: '4px', color: theme.colors.textMuted, fontFamily: theme.fonts.mono, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {profile.is2faEnabled && twoFaStep === 'idle' && (
                <button
                  onClick={() => { void handleDisable2fa(); }}
                  style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${theme.colors.dead}`, borderRadius: '4px', color: theme.colors.dead, fontFamily: theme.fonts.mono, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer' }}
                >
                  Disable 2FA
                </button>
              )}

              {twoFaMsg && (
                <p style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textSecondary, margin: '12px 0 0' }}>
                  {twoFaMsg}
                </p>
              )}
            </div>
          )}

          {/* Match History */}
          {matchHistory && (
            <div style={cardStyle}>
              <p style={sectionTitle}>Recent Matches ({matchHistory.total} total)</p>
              {matchHistory.entries.length === 0 && (
                <p style={{ fontFamily: theme.fonts.mono, fontSize: '13px', color: theme.colors.textMuted }}>No matches yet.</p>
              )}
              {matchHistory.entries.map((m) => (
                <div
                  key={m.matchId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    fontFamily: theme.fonts.mono,
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: resultColor(m.result), fontWeight: 700, width: '40px' }}>{m.result}</span>
                  <span style={{ color: theme.colors.textSecondary, width: '70px' }}>{m.mode}</span>
                  <span style={{ color: theme.colors.textMuted, width: '60px' }}>{m.durationSeconds}s</span>
                  <span style={{ color: theme.colors.textSecondary, flex: 1 }}>
                    {m.participants.map((p) => `${p.username ?? 'deleted'} (${p.characterName})`).join(' vs ')}
                  </span>
                  <span style={{ color: theme.colors.textMuted }}>
                    {new Date(m.playedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard && (
            <div style={cardStyle}>
              <p style={sectionTitle}>Leaderboard (top {leaderboard.entries.length} of {leaderboard.total})</p>
              {leaderboard.entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 0',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    fontFamily: theme.fonts.mono,
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: theme.colors.textMuted, width: '28px', textAlign: 'right' }}>#{entry.rank}</span>
                  <img
                    src={entry.avatarUrl}
                    alt={entry.username}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${theme.colors.border}` }}
                  />
                  <span style={{ flex: 1, color: theme.colors.textPrimary }}>{entry.username}</span>
                  <span style={{ color: theme.colors.gold, width: '60px', textAlign: 'right' }}>{entry.eloCurrent}</span>
                  <span style={{ color: theme.colors.hpHigh, width: '32px', textAlign: 'right' }}>{entry.totalWins}W</span>
                  <span style={{ color: theme.colors.dead, width: '32px', textAlign: 'right' }}>{entry.totalLosses}L</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        button:hover { border-color: ${theme.colors.borderHover} !important; color: ${theme.colors.gold} !important; }
      `}</style>
    </div>
  );
}
