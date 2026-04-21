import { useState } from 'react';
import { MatchMode } from '@transcendence/types';
import { theme } from '../configs/theme';
import Cerberus from '../assets/Cerberus.png';

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
    description: 'Fight with a friend on the same keyboard.',
  },
  {
    mode: MatchMode.AI,
    label: 'VS IA',
    description: 'Fight an automate bot.',
  },
  {
    mode: MatchMode.UNRANKED,
    label: 'NORMAL',
    description: 'Fight with a random player online withouth earn any points.',
  },
  {
    mode: MatchMode.RANKED,
    label: 'RANKED',
    description: 'Fight with a player based on your rank and compete for be the master of olympus.',
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
      justifyContent: 'center',
      backgroundImage: `url(${Cerberus})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      overflow: 'hidden',
    }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          background: 'none',
          border: `1px solid ${theme.colors.gold}`,
          borderRadius: '2px',
          color: theme.colors.gold,
          fontFamily: theme.fonts.heading,
          fontSize: '11px',
          letterSpacing: '3px',
          padding: '8px 20px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = theme.colors.goldBright;
          e.currentTarget.style.borderColor = theme.colors.goldBright;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = theme.colors.gold;
          e.currentTarget.style.borderColor = theme.colors.gold;
        }}
      >
        BACK
      </button>

      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: '60px',
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
          textShadow: `0 0 30px ${theme.colors.goldGlow}, 0 2px 8px rgba(0,0,0,0.8)`,
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
        gap: 'clamp(24px, 4vw, 56px)',
        animation: 'fadeUp 0.8s ease-out 0.2s both',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 20px',
      }}>
        {MODES.map((option) => {
          const isHovered = hoveredMode === option.mode;

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
                  width: 'clamp(160px, 18vw, 220px)',
                  height: 'clamp(160px, 18vw, 220px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${isHovered ? theme.colors.gold : theme.colors.goldDim}`,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'all 0.4s ease',
                  backgroundColor: isHovered ? 'rgba(200, 170, 100, 0.08)' : 'rgba(0, 0, 0, 0.3)',
                  boxShadow: isHovered
                    ? `0 0 50px rgba(200, 170, 100, 0.15), inset 0 0 40px rgba(200, 170, 100, 0.05)`
                    : `0 0 20px rgba(0, 0, 0, 0.5)`,
                }}
              >
                <span style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: 'clamp(18px, 2.2vw, 26px)',
                  fontWeight: 700,
                  color: isHovered ? theme.colors.gold : theme.colors.goldDim,
                  letterSpacing: '5px',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s ease',
                  textAlign: 'center',
                  textShadow: `0 0 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)`,
                }}>
                  {option.label}
                </span>
              </div>

              {/* Description — visible only on hover */}
              <div style={{
                marginTop: '20px',
                height: '50px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}>
                <p style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: '12px',
                  color: theme.colors.goldBright,
                  textAlign: 'center',
                  maxWidth: '200px',
                  lineHeight: 1.5,
                  margin: 0,
                  opacity: isHovered ? 1 : 0,
                  transform: isHovered ? 'translateY(0)' : 'translateY(-6px)',
                  transition: 'all 0.3s ease',
                  textShadow: `0 0 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)`,
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
