import { useState, useEffect } from 'react';
import { socketService } from '../services/socketServices';
import { GameEvents } from '../game/game.events';
import { MatchMode } from '../types/game.types';
import { theme } from '../configs/theme';
import { useRef } from 'react';

type Character = 'zeus' | 'ade';

interface CharacterSelectSceneProps {
  mode: MatchMode;
  isSocketReady: boolean;
  onConfirm: (p1: Character, p2: Character) => void;
  onBack: () => void;
}

const CHARACTERS: Character[] = ['zeus', 'ade'];

export default function CharacterSelectScene({
  mode,
  isSocketReady,
  onConfirm,
  onBack,
}: CharacterSelectSceneProps) {
  const isLocal = mode === MatchMode.LOCAL;
  const isAI = mode === MatchMode.AI;
  const isSplitScreen = isLocal || isAI;

  const [p1Index, setP1Index] = useState(0);
  const [p2Index, setP2Index] = useState(1);
  const [p1Confirmed, setP1Confirmed] = useState(false);
  const [p2Confirmed, setP2Confirmed] = useState(false);
  const [p1Hover, setP1Hover] = useState<number | null>(null);
  const [p2Hover, setP2Hover] = useState<number | null>(null);
  const [launching, setLaunching] = useState(false);
  
  const launchingRef = useRef(false);
  const p2Selectable = isLocal;

  // Auto-confirm P2 per AI e online
  useEffect(() => {
    if (!isLocal) setP2Confirmed(true);
  }, [isLocal]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (!p1Confirmed) {
        if (key === 'a' || key === 'd') { e.preventDefault(); setP1Index(prev => prev === 0 ? 1 : 0); }
        if (key === ' ') { e.preventDefault(); setP1Confirmed(true); }
      }

      if (p2Selectable && !p2Confirmed) {
        if (key === 'arrowleft' || key === 'arrowright') { e.preventDefault(); setP2Index(prev => prev === 0 ? 1 : 0); }
        if (key === 'enter') { e.preventDefault(); setP2Confirmed(true); }
      }

      if (key === 'escape') onBack();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [p1Confirmed, p2Confirmed, p2Selectable, onBack]);

  // Launch
  useEffect(() => {
    if (!p1Confirmed) return;
    if (isSplitScreen && !p2Confirmed) return;
    if (!isSocketReady) return;
    if (launchingRef.current) return;

    launchingRef.current = true;
    setLaunching(true); // solo per il FIGHT overlay

    const timer = setTimeout(() => {
      const finalP1 = CHARACTERS[p1Index];
      const finalP2 = CHARACTERS[p2Index];

      if (isLocal) {
        socketService.emit(GameEvents.JOIN_LOBBY, {
          characterName: [finalP1, finalP2],
          isLocalGame: true,
          isAiGame: false,
          matchType: 'ffa',
          userDbId: null,
        });
      } else if (isAI) {
        socketService.emit(GameEvents.JOIN_LOBBY, {
          characterName: [finalP1],
          isLocalGame: false,
          isAiGame: true,
          matchType: 'ffa',
          userDbId: null,
        });
      } else {
        socketService.emit(GameEvents.JOIN_LOBBY, {
          characterName: [finalP1],
          isLocalGame: false,
          isAiGame: false,
          matchType: 'ffa',
          userDbId: null,
        });
      }

      onConfirm(finalP1, finalP2);
    }, 600);

    return () => clearTimeout(timer);
  }, [p1Confirmed, p2Confirmed, isSocketReady]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: isSplitScreen ? 'row' : 'column',
      alignItems: isSplitScreen ? 'stretch' : 'center',
      backgroundColor: theme.colors.bg,
      overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 40%, rgba(80, 40, 0, 0.1) 0%, transparent 60%)`,
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

      {isSplitScreen ? (
        /* ====== SPLIT SCREEN (LOCAL / AI) ====== */
        <>
          <PlayerSide
            label="P1"
            controls="A, D for choose, SPACE for confirm"
            selectedIndex={p1Index}
            confirmed={p1Confirmed}
            hoveredIndex={p1Hover}
            onSelect={(i) => { if (!p1Confirmed) setP1Index(i); }}
            onHover={setP1Hover}
            onConfirm={() => setP1Confirmed(true)}
            disabled={false}
          />

          <div style={{
            width: '1px',
            background: `linear-gradient(180deg, transparent 10%, ${theme.colors.goldSubtle} 50%, transparent 90%)`,
            zIndex: 2,
          }} />

          <PlayerSide
            label={isAI ? 'CPU' : 'P2'}
            controls={p2Selectable ? '←, →  for choose. ENTER for confirm' : 'AUTO'}
            selectedIndex={p2Index}
            confirmed={p2Confirmed}
            hoveredIndex={p2Hover}
            onSelect={(i) => { if (p2Selectable && !p2Confirmed) setP2Index(i); }}
            onHover={p2Selectable ? setP2Hover : () => {}}
            onConfirm={() => { if (p2Selectable) setP2Confirmed(true); }}
            disabled={!p2Selectable}
          />
        </>
      ) : (
        /* ====== SINGLE SELECT (RANKED / UNRANKED) ====== */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}>
          <h2 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '28px',
            fontWeight: 700,
            color: theme.colors.gold,
            letterSpacing: '8px',
            textTransform: 'uppercase',
            margin: 0,
            textShadow: `0 0 30px ${theme.colors.goldGlow}`,
          }}>
            Choose Your Champion
          </h2>

          <div style={{
            marginTop: '12px',
            width: '120px',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${theme.colors.goldMuted}, transparent)`,
          }} />

          {/* Preview */}
          <div style={{
            marginTop: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              width: '250px',
              height: '250px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.colors.goldGlow} 0%, transparent 70%)`,
              transition: 'all 0.5s ease',
            }} />

            <span style={{
              fontFamily: theme.fonts.heading,
              fontSize: 'clamp(48px, 6vw, 72px)',
              fontWeight: 700,
              color: theme.colors.gold,
              textShadow: `0 0 30px ${theme.colors.goldGlow}`,
              textTransform: 'uppercase',
              letterSpacing: '8px',
              transition: 'all 0.3s ease',
              zIndex: 2,
            }}>
              {CHARACTERS[p1Hover ?? p1Index]}
            </span>

            <div style={{
              marginTop: '24px',
              width: '150px',
              height: '200px',
              border: `1px dashed ${theme.colors.goldSubtle}`,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.textMuted,
              fontFamily: theme.fonts.mono,
              fontSize: '10px',
              zIndex: 2,
            }}>
              3D MODEL
            </div>

            {p1Confirmed && (
              <div style={{
                marginTop: '16px',
                fontFamily: theme.fonts.heading,
                fontSize: '14px',
                color: theme.colors.gold,
                letterSpacing: '6px',
                zIndex: 2,
                animation: 'fadeIn 0.3s ease-out',
              }}>
                READY
              </div>
            )}
          </div>

          {/* Selection buttons */}
          <div style={{ display: 'flex', gap: '30px', marginTop: '50px' }}>
            {CHARACTERS.map((char, index) => {
              const isSelected = p1Index === index;
              const isHov = p1Hover === index;
              const active = isSelected || isHov;

              return (
                <div
                  key={char}
                  onClick={() => { if (!p1Confirmed) setP1Index(index); }}
                  onMouseEnter={() => { if (!p1Confirmed) setP1Hover(index); }}
                  onMouseLeave={() => { if (!p1Confirmed) setP1Hover(null); }}
                  onDoubleClick={() => { if (!p1Confirmed) { setP1Index(index); setP1Confirmed(true); } }}
                  style={{
                    width: '160px',
                    height: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${active ? theme.colors.goldDim : theme.colors.border}`,
                    borderRadius: '3px',
                    cursor: p1Confirmed ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: isSelected ? 'rgba(200, 170, 100, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    boxShadow: active ? `0 0 20px ${theme.colors.goldGlow}` : 'none',
                    opacity: p1Confirmed && !isSelected ? 0.3 : 1,
                  }}
                >
                  <span style={{
                    fontFamily: theme.fonts.heading,
                    fontSize: '16px',
                    fontWeight: isSelected ? 700 : 400,
                    color: active ? theme.colors.gold : theme.colors.goldMuted,
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    transition: 'all 0.3s ease',
                  }}>
                    {char}
                  </span>
                </div>
              );
            })}
          </div>

          <p style={{
            marginTop: '20px',
            fontFamily: theme.fonts.mono,
            fontSize: '10px',
            color: theme.colors.textMuted,
            letterSpacing: '2px',
          }}>
            A, D for moving.
            SPACE for confirm
          </p>
        </div>
      )}

      {/* FIGHT overlay */}
      {launching && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          animation: 'fadeIn 0.4s ease-out',
        }}>
          <h2 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '42px',
            color: theme.colors.gold,
            letterSpacing: '12px',
            textShadow: `0 0 40px ${theme.colors.goldGlow}`,
            animation: 'scaleIn 0.5s ease-out',
          }}>
            FIGHT
          </h2>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

// --- Player Side (split screen) ---

interface PlayerSideProps {
  label: string;
  controls: string;
  selectedIndex: number;
  confirmed: boolean;
  hoveredIndex: number | null;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
  onConfirm: () => void;
  disabled: boolean;
}

function PlayerSide({
  label, controls, selectedIndex, confirmed,
  hoveredIndex, onSelect, onHover, onConfirm, disabled,
}: PlayerSideProps) {
  const displayChar = CHARACTERS[hoveredIndex ?? selectedIndex];

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      padding: '40px 20px',
      opacity: disabled ? 0.5 : 1,
    }}>
      <h2 style={{
        fontFamily: theme.fonts.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: theme.colors.gold,
        letterSpacing: '8px',
        margin: 0,
        marginTop: '20px',
      }}>
        {label}
      </h2>

      <p style={{
        fontFamily: theme.fonts.mono,
        fontSize: '10px',
        color: theme.colors.textMuted,
        letterSpacing: '2px',
        marginTop: '8px',
      }}>
        {controls}
      </p>

      {/* Preview */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.colors.goldGlow} 0%, transparent 70%)`,
          transition: 'all 0.5s ease',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2,
          transform: confirmed ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.3s ease',
        }}>
          <span style={{
            fontFamily: theme.fonts.heading,
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 700,
            color: theme.colors.gold,
            textShadow: `0 0 30px ${theme.colors.goldGlow}`,
            textTransform: 'uppercase',
            letterSpacing: '6px',
            transition: 'all 0.3s ease',
          }}>
            {displayChar}
          </span>

          <div style={{
            marginTop: '20px',
            width: '120px',
            height: '160px',
            border: `1px dashed ${theme.colors.goldSubtle}`,
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.textMuted,
            fontFamily: theme.fonts.mono,
            fontSize: '10px',
          }}>
            3D MODEL
          </div>

          {confirmed && (
            <div style={{
              marginTop: '16px',
              fontFamily: theme.fonts.heading,
              fontSize: '12px',
              color: theme.colors.gold,
              letterSpacing: '4px',
              animation: 'fadeIn 0.3s ease-out',
            }}>
              READY
            </div>
          )}
        </div>
      </div>

      {/* Selection buttons */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        {CHARACTERS.map((char, index) => {
          const isSelected = selectedIndex === index;
          const isHov = hoveredIndex === index;
          const active = isSelected || isHov;

          return (
            <div
              key={char}
              onClick={() => { if (!disabled && !confirmed) onSelect(index); }}
              onMouseEnter={() => { if (!disabled && !confirmed) onHover(index); }}
              onMouseLeave={() => { if (!disabled && !confirmed) onHover(null); }}
              onDoubleClick={() => { if (!disabled && !confirmed) { onSelect(index); onConfirm(); } }}
              style={{
                width: 'clamp(100px, 12vw, 140px)',
                height: 'clamp(50px, 6vh, 70px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${active ? theme.colors.goldDim : theme.colors.border}`,
                borderRadius: '3px',
                cursor: disabled || confirmed ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: isSelected ? 'rgba(200, 170, 100, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                boxShadow: active ? `0 0 20px ${theme.colors.goldGlow}` : 'none',
                opacity: confirmed && !isSelected ? 0.3 : 1,
              }}
            >
              <span style={{
                fontFamily: theme.fonts.heading,
                fontSize: '14px',
                fontWeight: isSelected ? 700 : 400,
                color: active ? theme.colors.gold : theme.colors.goldMuted,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease',
              }}>
                {char}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}