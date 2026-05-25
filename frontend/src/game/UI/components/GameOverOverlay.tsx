import { GameOverPayload } from '../../../types/game.types';
import { PlayerSnapshot } from '@transcendence/types';
import { theme } from '../../../configs/theme';

interface GameOverOverlayProps {
  gameOver: GameOverPayload;
  players: PlayerSnapshot[];
  onPlayAgain: () => void;
  onQuit: () => void;
  myUserId?: string;
}

export function GameOverOverlay({ gameOver, players, onPlayAgain, onQuit, myUserId }: GameOverOverlayProps) {
  const winnerStats: any[] = gameOver.finalData?.winnerPlayerStats || [];
  const loserStats: any[] = gameOver.finalData?.loserPlayerStats || [];

  const isDraw = winnerStats.length === 0;
  const amIWinner = winnerStats.some((s: any) => s.userName === myUserId);

  const resultText = isDraw ? 'Draw' : (amIWinner ? 'You Win' : 'You Lose');
  const resultColor = isDraw ? theme.colors.textSecondary : (amIWinner ? theme.colors.zeus : theme.colors.dead);
  const resultGlow = isDraw ? 'none' : `0 0 20px ${resultColor}, 0 0 60px ${resultColor}`;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 2000,
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <h1 style={{
        fontSize: '72px',
        fontFamily: theme.fonts.heading,
        fontWeight: 'bold',
        color: resultColor,
        textShadow: resultGlow,
        letterSpacing: '6px',
        textTransform: 'uppercase',
        margin: 0,
        animation: 'scaleIn 0.6s ease-out',
      }}>
        {resultText}
      </h1>

      <p style={{
        fontSize: '14px',
        fontFamily: theme.fonts.mono,
        color: theme.colors.textMuted,
        letterSpacing: '3px',
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xl,
      }}>
        CLASH OF OLYMPUS
      </p>

      <div style={{
        backgroundColor: theme.colors.bgDark,
        border: `1px solid ${resultColor}`,
        borderRadius: '12px',
        minWidth: '420px',
        boxShadow: resultGlow,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 80px',
          padding: '14px 24px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <HeaderCell>PLAYER</HeaderCell>
          <HeaderCell center>KILLS</HeaderCell>
          <HeaderCell center>DEATHS</HeaderCell>
        </div>

        {winnerStats.map((s: any, i: number) => {
          const player = players.find(p => (p as any).userName === s.userName);
          const isMe = s.userName === myUserId;
          return (
            <div key={`w-${i}`} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px',
              padding: '12px 24px', backgroundColor: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>👑</span>
                <span style={{
                  color: isMe ? '#66B2FF' : '#FF6666', fontSize: '16px',
                  fontWeight: 'bold', fontFamily: theme.fonts.heading,
                }}>{s.userName}</span>
                <span style={{ color: theme.colors.textMuted, fontSize: '11px', fontFamily: theme.fonts.mono }}>
                  ({player ? player.characterName.charAt(0).toUpperCase() + player.characterName.slice(1) : '?'})
                </span>
              </div>
              <StatCell>{String(s.kill)}</StatCell>
              <StatCell>{String(s.dead)}</StatCell>
            </div>
          );
        })}

        {winnerStats.length > 0 && loserStats.length > 0 && (
          <div style={{ height: '1px', backgroundColor: theme.colors.border }} />
        )}

        {loserStats.map((s: any, i: number) => {
          const player = players.find(p => (p as any).userName === s.userName);
          const isMe = s.userName === myUserId;
          return (
            <div key={`l-${i}`} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px',
              padding: '12px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  color: isMe ? '#66B2FF' : '#FF6666', fontSize: '16px',
                  fontFamily: theme.fonts.heading,
                }}>{s.userName}</span>
                <span style={{ color: theme.colors.textMuted, fontSize: '11px', fontFamily: theme.fonts.mono }}>
                  ({player ? player.characterName.charAt(0).toUpperCase() + player.characterName.slice(1) : '?'})
                </span>
              </div>
              <StatCell>{String(s.kill)}</StatCell>
              <StatCell>{String(s.dead)}</StatCell>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '40px',
        display: 'flex',
        gap: '24px',
      }}>
        <button
          onClick={onPlayAgain}
          style={{
            padding: '14px 48px',
            background: 'none',
            border: `1px solid ${theme.colors.goldDim}`,
            color: theme.colors.gold,
            fontFamily: theme.fonts.heading,
            fontSize: '13px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.gold;
            e.currentTarget.style.boxShadow = `0 0 20px ${theme.colors.goldGlow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.goldDim;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Play Again
        </button>

        <button
          onClick={onQuit}
          style={{
            padding: '14px 48px',
            background: 'none',
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.textMuted,
            fontFamily: theme.fonts.heading,
            fontSize: '13px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.goldSubtle;
            e.currentTarget.style.color = theme.colors.goldDim;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.color = theme.colors.textMuted;
          }}
        >
          Quit
        </button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function HeaderCell({ children, center }: { children: string; center?: boolean }) {
  return (
    <span style={{
      color: theme.colors.textSecondary,
      fontSize: '11px',
      fontFamily: theme.fonts.mono,
      fontWeight: 'bold',
      letterSpacing: '2px',
      textAlign: center ? 'center' : 'left',
    }}>
      {children}
    </span>
  );
}

function StatCell({ children }: { children: string }) {
  return (
    <span style={{
      color: theme.colors.textPrimary,
      fontSize: '18px',
      fontWeight: 'bold',
      fontFamily: theme.fonts.mono,
      textAlign: 'center',
    }}>
      {children}
    </span>
  );
}