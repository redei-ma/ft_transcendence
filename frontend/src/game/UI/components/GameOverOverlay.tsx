import { GameOverPayload, PlayerSnapshot } from '../../../types/game.types';
import { theme } from '../../../configs/theme';

interface GameOverOverlayProps {
  gameOver: GameOverPayload;
  players: PlayerSnapshot[];
}

export function GameOverOverlay({ gameOver, players }: GameOverOverlayProps) {
  const winnerIds = new Set(gameOver.winnerData?.winnerPlayersIds || []);

  const winners = players.filter(p => winnerIds.has(p.id));
  const losers = players.filter(p => !winnerIds.has(p.id));

  const winnerName = winners.length > 0
    ? winners[0].characterName
    : 'unknown';

  const displayName = winnerName.charAt(0).toUpperCase() + winnerName.slice(1);
  const isDraw = winners.length === 0;

  const color = winnerName === 'zeus' ? theme.colors.zeus : theme.colors.ade;
  const glow = winnerName === 'zeus' ? theme.colors.zeusGlow : theme.colors.adeGlow;

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
      {/* Winner Title */}
      <h1 style={{
        fontSize: '72px',
        fontFamily: theme.fonts.heading,
        fontWeight: 'bold',
        color: isDraw ? theme.colors.textSecondary : color,
        textShadow: isDraw ? 'none' : `0 0 20px ${color}, 0 0 60px ${color}`,
        letterSpacing: '6px',
        textTransform: 'uppercase',
        margin: 0,
        animation: 'scaleIn 0.6s ease-out',
      }}>
        {isDraw ? 'Draw' : `${displayName} Wins`}
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

      {/* Scoreboard */}
      <div style={{
        backgroundColor: theme.colors.bgDark,
        border: `1px solid ${isDraw ? theme.colors.border : color}`,
        borderRadius: '12px',
        minWidth: '420px',
        boxShadow: isDraw ? 'none' : `0 0 30px ${glow}`,
        overflow: 'hidden',
      }}>
        {/* Table Header */}
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

        {/* Winners */}
        {winners.map((p) => (
          <PlayerRow key={p.id} player={p} isWinner />
        ))}

        {losers.length > 0 && winners.length > 0 && (
          <div style={{ height: '1px', backgroundColor: theme.colors.border }} />
        )}

        {/* Losers */}
        {losers.map((p) => (
          <PlayerRow key={p.id} player={p} isWinner={false} />
        ))}
      </div>

      {/* Placeholder */}
      <p style={{
        marginTop: theme.spacing.xl,
        color: theme.colors.textMuted,
        fontSize: '12px',
        fontFamily: theme.fonts.mono,
      }}>
        [ victory artwork placeholder ]
      </p>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// --- Sub-components ---

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

function PlayerRow({ player, isWinner }: { player: PlayerSnapshot; isWinner: boolean }) {
  const playerColor = player.characterName === 'zeus'
    ? theme.colors.zeus
    : theme.colors.ade;

  const displayName = player.characterName.charAt(0).toUpperCase() + player.characterName.slice(1);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 80px 80px',
      padding: '12px 24px',
      backgroundColor: isWinner ? 'rgba(255,255,255,0.02)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isWinner && <span>👑</span>}
        <span style={{
          color: playerColor,
          fontSize: '16px',
          fontWeight: isWinner ? 'bold' : 'normal',
          fontFamily: theme.fonts.heading,
        }}>
          {displayName}
        </span>
        <span style={{
          color: theme.colors.textMuted,
          fontSize: '11px',
          fontFamily: theme.fonts.mono,
        }}>
          (Team {player.teamId})
        </span>
      </div>

      <StatCell>—</StatCell>
      <StatCell>—</StatCell>
    </div>
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