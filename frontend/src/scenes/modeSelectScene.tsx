import { useState } from 'react';
import { MatchMode } from '../types/game.types';
import { theme } from '../configs/theme';

interface ModeSelectSceneProps {
  onModeSelect: (mode: MatchMode) => void;
  onBack: () => void;
}

interface ModeOption {
  mode: MatchMode;
  label: string;
  description: string;
}

const MODES: ModeOption[] = [
  {
    mode: MatchMode.LOCAL,
    label: 'LOCAL',
    description: 'Sfida un tuo amico sulla stessa tastiera.',
  },
  {
    mode: MatchMode.AI,
    label: 'VS IA',
    description: 'Sfida un bot automatico.',
  },
  {
    mode: MatchMode.UNRANKED,
    label: 'NORMAL',
    description: 'Sfida un avversario casuale. Il primo a fare 5 uccisioni ha vinto.',
  },
  {
    mode: MatchMode.RANKED,
    label: 'RANKED',
    description: 'Sfida un avversario casuale in modalità classificata.',
  },
];

export default function ModeSelectScene({ onModeSelect, onBack }: ModeSelectSceneProps) {
  const [hoveredMode, setHoveredMode] = useState<MatchMode | null>(null);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: theme.colors.bg,
      overflow: 'hidden',
    }}>
      {/* Background placeholder */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 30%, rgba(80, 40, 0, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 50% 70%, rgba(0, 40, 80, 0.08) 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      {/* Back */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          background: 'none',
          border: `1px solid ${theme.colors.goldSubtle}`,
          borderRadius: '2px',
          color: theme.colors.goldDim,
          fontFamily: theme.fonts.heading,
          fontSize: '11px',
          letterSpacing: '3px',
          padding: '8px 20px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = theme.colors.gold;
          e.currentTarget.style.borderColor = theme.colors.borderHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = theme.colors.goldDim;
          e.currentTarget.style.borderColor = theme.colors.goldSubtle;
        }}
      >
        BACK
      </button>

      {/* Title */}
      <div style={{
        marginTop: 'clamp(60px, 12vh, 120px)',
        textAlign: 'center',
        animation: 'fadeDown 0.8s ease-out',
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontFamily: theme.fonts.heading,
          fontWeight: 700,
          color: theme.colors.gold,
          letterSpacing: '8px',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: `0 0 30px ${theme.colors.goldGlow}`,
        }}>
          Choose Your Battle
        </h1>
        <div style={{
          marginTop: '12px',
          width: '120px',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${theme.colors.goldMuted}, transparent)`,
          margin: '12px auto 0',
        }} />
      </div>

      {/* Mode buttons */}
      <div style={{
        display: 'flex',
        gap: 'clamp(16px, 3vw, 40px)',
        marginTop: 'clamp(60px, 10vh, 100px)',
        animation: 'fadeUp 0.8s ease-out 0.2s both',
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '0 20px',
      }}>
        {MODES.map((option) => {
          const isHovered = hoveredMode === option.mode;
          const isOnline = option.mode === MatchMode.RANKED || option.mode === MatchMode.UNRANKED;

          return (
            <div key={option.mode} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div
                onClick={() => onModeSelect(option.mode)}
                onMouseEnter={() => setHoveredMode(option.mode)}
                onMouseLeave={() => setHoveredMode(null)}
                style={{
                  width: 'clamp(130px, 15vw, 180px)',
                  height: 'clamp(130px, 15vw, 180px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${isHovered ? theme.colors.goldDim : theme.colors.border}`,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'all 0.4s ease',
                  backgroundColor: isHovered ? 'rgba(200, 170, 100, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                  boxShadow: isHovered ? `0 0 40px rgba(200, 170, 100, 0.1), inset 0 0 30px rgba(200, 170, 100, 0.03)` : 'none',
                  position: 'relative',
                }}
              >
                <span style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: 'clamp(14px, 1.8vw, 20px)',
                  fontWeight: 700,
                  color: isHovered ? theme.colors.gold : theme.colors.goldDim,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s ease',
                  textAlign: 'center',
                }}>
                  {option.label}
                </span>

                {isOnline && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    fontSize: '8px',
                    fontFamily: theme.fonts.mono,
                    letterSpacing: '1px',
                    color: theme.colors.textMuted,
                    textTransform: 'uppercase',
                  }}>
                    soon
                  </div>
                )}
              </div>

              <div style={{ marginTop: '16px', height: '40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <p style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: '11px',
                  color: theme.colors.goldDim,
                  textAlign: 'center',
                  maxWidth: '180px',
                  lineHeight: 1.5,
                  margin: 0,
                  opacity: isHovered ? 1 : 0,
                  transform: isHovered ? 'translateY(0)' : 'translateY(-4px)',
                  transition: 'all 0.3s ease',
                }}>
                  {option.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}