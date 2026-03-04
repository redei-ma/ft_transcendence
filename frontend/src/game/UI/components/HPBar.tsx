import { Vector } from '../../../types/game.types';
import { theme } from '../../../configs/theme';

interface HPBarProps {
  characterName: string;
  maxHP: number;
  currentHP: number;
  isDisconnected?: boolean;
  disconnectionTimer?: number;
  playerPosition: Vector | null;
}

export default function HPBar({
  characterName,
  maxHP,
  currentHP,
  isDisconnected = false,
  disconnectionTimer = 0,
}: HPBarProps) {
  const clampedHP = Math.max(0, currentHP);
  const hpPercent = (clampedHP / maxHP) * 100;

  const barColor = hpPercent > 60
    ? theme.colors.hpHigh
    : hpPercent > 30
      ? theme.colors.hpMid
      : theme.colors.hpLow;

  return (
    <div style={{
      position: 'absolute',
      top: characterName === 'zeus' ? '20px' : 'auto',
      bottom: characterName === 'ade' ? '20px' : 'auto',
      left: '20px',
      width: '120px',
      fontFamily: theme.fonts.mono,
      pointerEvents: 'none',
      zIndex: 1000,
    }}>
      {/* Name */}
      <div style={{
        color: theme.colors.goldDim,
        fontSize: '13px',
        fontWeight: 'bold',
        marginBottom: '4px',
        textAlign: 'center',
        textShadow: `0 0 8px ${theme.colors.goldDim}`,
      }}>
        {characterName}
      </div>

      {/* Bar container */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: theme.colors.bgDark,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${hpPercent}%`,
          height: '100%',
          backgroundColor: barColor,
          transition: 'width 0.3s ease, background-color 0.3s ease',
          boxShadow: `0 0 8px ${barColor}`,
        }} />
      </div>

      {/* HP text */}
      <div style={{
        color: theme.colors.textSecondary,
        fontSize: '10px',
        marginTop: '3px',
        textAlign: 'center',
      }}>
        {clampedHP}/{maxHP}
      </div>

      {/* AFK indicator */}
      {isDisconnected && (
        <div style={{
          color: theme.colors.afk,
          fontSize: '11px',
          fontWeight: 'bold',
          marginTop: '4px',
          textAlign: 'center',
          animation: 'pulse 1s infinite',
        }}>
          ⚠️ AFK {Math.ceil(disconnectionTimer)}s
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}