import { useState, useEffect } from 'react';
import { inputStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as api from '../services/apiService';
import { theme } from '../../configs/theme';
import { NAVBAR_HEIGHT } from '../components/Navbar';
import { LeaderboardEntry } from '../services/apiService'; // Importiamo il tipo esatto!

const rankColor = (r: number) => 
  r === 1 ? '#FFD700' : 
  r === 2 ? '#C0C0C0' : 
  r === 3 ? '#CD7F32' : 
  theme.colors.textSecondary;

export default function LeaderboardPage() {
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard(1, 50).then((data) => {
      if (data?.entries) setEntries(data.entries);
      setLoading(false);
    });
  }, []);

  const filtered = entries.filter((p) => p.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fadeIn" style={{ 
      paddingTop: `${NAVBAR_HEIGHT + 40}px`, 
      maxWidth: '800px', 
      margin: '0 auto', 
      paddingBottom: '40px',
      paddingLeft: '24px',
      paddingRight: '24px'
    }}>
      <h1 style={{ 
        fontFamily: theme.fonts.heading, fontSize: '32px', fontWeight: 700, 
        color: theme.colors.gold, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '32px' 
      }}>Leaderboard</h1>

      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <input className="input-glow" type="text" placeholder="Search players..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: '44px' }} />
        <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.textMuted, pointerEvents: 'none' }}>
          <Icons.Search size={18} />
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, textAlign: 'center', letterSpacing: '2px' }}>Loading...</p>
      ) : (
        <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 80px', padding: '12px 20px', 
            background: theme.colors.bgPanel, borderBottom: `1px solid ${theme.colors.border}` 
          }}>
            {['RANK', 'PLAYER', 'ELO', 'WINS', 'LOSSES'].map((h) => (
              <span key={h} style={{ fontFamily: theme.fonts.heading, fontSize: '10px', fontWeight: 700, color: theme.colors.textMuted, letterSpacing: '1.5px' }}>{h}</span>
            ))}
          </div>
          
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontFamily: theme.fonts.mono, color: theme.colors.textMuted, fontSize: '13px' }}>
              No players found
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 80px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: `1px solid ${theme.colors.border}`, cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme.colors.bgPanel}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: '16px', color: rankColor(p.rank) }}>{p.rank}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={p.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${rankColor(p.rank)}` }} />
                  <span style={{ fontFamily: theme.fonts.heading, fontWeight: 600, fontSize: '14px', color: theme.colors.textPrimary }}>{p.username}</span>
                </div>
                <span style={{ fontFamily: theme.fonts.heading, fontWeight: 700, fontSize: '15px', color: theme.colors.gold }}>{p.eloCurrent}</span>
                <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.hpHigh, fontSize: '14px' }}>{p.totalWins}</span>
                <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.hpLow, fontSize: '14px' }}>{p.totalLosses}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}