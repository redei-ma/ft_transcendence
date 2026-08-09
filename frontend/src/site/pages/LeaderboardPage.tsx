import { useState, useEffect } from 'react';
import { inputStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as api from '../services/apiService';
import { theme } from '../../configs/theme';
import { NAVBAR_HEIGHT } from '../components/Navbar';
import { LeaderboardEntry } from '../services/apiService';
import { useResponsive } from '../../hooks/useResponsive';

const rankColor = (r: number) => 
  r === 1 ? '#FFD700' : 
  r === 2 ? '#C0C0C0' : 
  r === 3 ? '#CD7F32' : 
  theme.colors.textSecondary;


export default function LeaderboardPage() {
  const { isMobile } = useResponsive();
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

  // Layout flessibile in base al dispositivo
  const gridColumns = isMobile 
    ? '50px 1fr 60px' // Mobile: solo Rank, Nome, ELO
    : '60px 1fr 100px 80px 80px'; // Desktop/Landscape: tutto

  const headers = isMobile 
    ? ['RANK', 'PLAYER', 'ELO'] 
    : ['RANK', 'PLAYER', 'ELO', 'WINS', 'LOSSES'];

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
        fontFamily: theme.fonts.heading, fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, 
        color: theme.colors.gold, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '32px',
        textAlign: isMobile ? 'center' : 'left'
      }}>
        Leaderboard
      </h1>

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
          
          {/* HEADER DELLA TABELLA */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: gridColumns, padding: '12px 16px', 
            background: theme.colors.bgPanel, borderBottom: `1px solid ${theme.colors.border}` 
          }}>
            {headers.map((h) => (
              <span key={h} style={{ 
                fontFamily: theme.fonts.heading, fontSize: '10px', fontWeight: 700, 
                color: theme.colors.textMuted, letterSpacing: '1.5px',
                textAlign: h === 'PLAYER' ? 'left' : 'center' // Centra tutte le scritte tranne il Player
              }}>
                {h}
              </span>
            ))}
          </div>
          
          {/* RIGHE DELLA TABELLA */}
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontFamily: theme.fonts.mono, color: theme.colors.textMuted, fontSize: '13px' }}>
              No players found
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: gridColumns,
                padding: '14px 16px', alignItems: 'center',
                borderBottom: `1px solid ${theme.colors.border}`, cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme.colors.bgPanel}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                
                {/* RANK */}
                <span style={{ fontFamily: theme.fonts.heading, fontWeight: 800, fontSize: '16px', color: rankColor(p.rank), textAlign: 'center' }}>
                  {p.rank}
                </span>
                
                {/* AVATAR + PLAYER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <img src={p.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${rankColor(p.rank)}`, flexShrink: 0 }} />
                  {/* Il textOverflow ellipsis taglia i nomi troppo lunghi su mobile mettendo i puntini */}
                  <span style={{ fontFamily: theme.fonts.heading, fontWeight: 600, fontSize: '14px', color: theme.colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.username}
                  </span>
                </div>
                
                {/* ELO */}
                <span style={{ fontFamily: theme.fonts.heading, fontWeight: 700, fontSize: '15px', color: theme.colors.gold, textAlign: 'center' }}>
                  {p.eloCurrent}
                </span>
                
                {/* WINS E LOSSES (Mostrati solo se non è mobile) */}
                {!isMobile && (
                  <>
                    <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.hpHigh, fontSize: '14px', textAlign: 'center' }}>{p.totalWins}</span>
                    <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.hpLow, fontSize: '14px', textAlign: 'center' }}>{p.totalLosses}</span>
                  </>
                )}

              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}