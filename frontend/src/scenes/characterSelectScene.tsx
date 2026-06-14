import { useState, useEffect, useRef } from 'react';
import { matchmakingSocket } from '../services/matchmakingSocket';
import { CharacterName, MatchMode, MatchType, GameEvents } from '@transcendence/types';
import { theme } from '../configs/theme';
import { logger } from '../configs/logger';

// Bottoni centrali
import zeusBtn from '../assets/images/ZeusButton.png';
import adeBtn from '../assets/images/AdeButton.png';
// Sfondi
import zeusBg from '../assets/images/ZeusSelection.png';
import adeBg from '../assets/images/AdeSelection.png';

import { useFullscreenGuard } from '../hooks/useFullscreenGuard';
import { FullscreenGate } from '../site/components/FullscreenGate';

type Character = typeof CharacterName[keyof typeof CharacterName];

interface CharacterSelectSceneProps {
  mode: MatchMode;
  userDbId: string;
  onConfirm: (p1: Character, p2: Character) => void;
  onBack: () => void;
  sessionId?: string | null;
}

const CHARACTERS: Character[] = [CharacterName.ZEUS, CharacterName.ADE];

// Bottoni centrali
const CHARACTER_BUTTONS: Record<Character, string> = {
  [CharacterName.ZEUS]: zeusBtn,
  [CharacterName.ADE]: adeBtn,
};

// Sfondi
const CHARACTER_BACKGROUNDS: Record<Character, string> = {
  [CharacterName.ZEUS]: zeusBg,
  [CharacterName.ADE]: adeBg,
};

// Split mode: spazio libero al centro e card laterali.
const CENTER_GAP = '150px';
const CARD_HEIGHT = '75%';
const CARD_TOP = `calc((100% - ${CARD_HEIGHT}) / 2)`;

// Single mode: una sola card centrata (più bassa per fare spazio ai bottoni sotto).
const SINGLE_CARD_HEIGHT = '64%';
const SINGLE_CARD_WIDTH = 'clamp(320px, 38vw, 520px)';
const SINGLE_CARD_TOP = `calc((100% - ${SINGLE_CARD_HEIGHT}) / 2)`;
const SINGLE_CARD_BOTTOM = `calc((100% + ${SINGLE_CARD_HEIGHT}) / 2)`;

const P1_COLOR = theme.colors.zeus;
const P1_GLOW = theme.colors.zeusGlow;
const P2_COLOR = theme.colors.ade;
const P2_GLOW = theme.colors.adeGlow;

export default function CharacterSelectScene({
  mode,
  userDbId,
  onConfirm,
  onBack,
  sessionId,
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
  const p2Selectable = isLocal || isAI;

  // Calcolo dei personaggi attualmente "attivi" (hover o selezionati) per gli sfondi
  const activeP1 = CHARACTERS[p1Hover ?? p1Index];
  const activeP2 = CHARACTERS[p2Hover ?? p2Index];

  const { isFullscreen, enter, kickAt } = useFullscreenGuard(false, () => {});

  useEffect(() => {
    if (!isSplitScreen) setP2Confirmed(true);
  }, [isSplitScreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      const key = e.key.toLowerCase();

      if (isSplitScreen) {
        if (!p1Confirmed) {
          if (key === 'w' || key === 's') {
            e.preventDefault();
            setP1Index(prev => prev === 0 ? 1 : 0);
          }
          if (key === ' ') {
            e.preventDefault();
            setP1Confirmed(true);
          }
        }
        if (p2Selectable && !p2Confirmed) {
          if (key === 'arrowup' || key === 'arrowdown') {
            e.preventDefault();
            setP2Index(prev => prev === 0 ? 1 : 0);
          }
          if (key === 'enter') {
            e.preventDefault();
            setP2Confirmed(true);
          }
        }
      } else {
        if (!p1Confirmed) {
          if (key === 'a' || key === 'd' || key === 'arrowleft' || key === 'arrowright') {
            e.preventDefault();
            setP1Index(prev => prev === 0 ? 1 : 0);
          }
          if (key === ' ' || key === 'enter') {
            e.preventDefault();
            setP1Confirmed(true);
          }
        }
      }

      if (key === 'escape') onBack();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [p1Confirmed, p2Confirmed, p2Selectable, isSplitScreen, onBack, isFullscreen]);
  
  // Launch — emit to Leonardo via matchmaking socket
  useEffect(() => {
    if (!p1Confirmed) return;
    if (isSplitScreen && !p2Confirmed) return;
    if (launchingRef.current) return;

    launchingRef.current = true;
    setLaunching(true);

    const timer = setTimeout(() => {
      const finalP1 = CHARACTERS[p1Index];
      const finalP2 = CHARACTERS[p2Index];
      
    if (sessionId) {
        // Direct invite — join alla sessione privata
        logger.debug('CharSelect', 'Emitting JOIN_DIRECT_SESSION:', { sessionId, characterName: finalP1 });
        matchmakingSocket.emit(GameEvents.JOIN_DIRECT_SESSION, { sessionId, characterName: finalP1 });
      } else {
        // Flusso normale — coda pubblica
        const payload = {
          characterName: isSplitScreen ? [finalP1, finalP2] : [finalP1],
          rank: (mode === MatchMode.RANKED || mode === MatchMode.UNRANKED) ? 500 : null,
          rankRange: (mode === MatchMode.RANKED || mode === MatchMode.UNRANKED) ? 100 : null,
          matchType: MatchType.FFA,
          matchMode: mode,
          isAiPlayer: isAI,
        };

        let event: GameEvents;
        if (isLocal) event = GameEvents.JOIN_LOCAL;
        else if (isAI) event = GameEvents.JOIN_AI;
        else if (mode === MatchMode.RANKED) event = GameEvents.JOIN_RANKED;
        else event = GameEvents.JOIN_UNRANKED;

        logger.debug('CharSelect', `Emitting ${event}:`, payload);
        matchmakingSocket.emit(event, payload);
      }

      onConfirm(finalP1, finalP2);
    }, 600);

    return () => clearTimeout(timer);
  }, [p1Confirmed, p2Confirmed]);

  function getSharedButtonGlow(index: number): string {
    const p1On = p1Index === index;
    const p2On = p2Index === index;

    if (p1On && p2On) {
      return `
        -20px 0 16px -2px ${P1_GLOW},
        20px 0 16px -2px ${P2_GLOW}
      `;
    }
    if (p1On) return `-10px 0 16px ${P1_GLOW}`;
    if (p2On) return `10px 0 16px ${P2_GLOW}`;
    return 'none';
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: isSplitScreen ? 'row' : 'column',
      alignItems: isSplitScreen ? 'stretch' : 'center',
      backgroundColor: theme.colors.bgDark, // Background di base
      overflow: 'hidden',
    }}>

      {/* ─── DYNAMIC BACKGROUNDS ─── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 0 }}>
        {isSplitScreen ? (
          <>
            {/* Card P1 — riempie quasi la metà sinistra, spinta verso l'esterno */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '32px',
              paddingRight: CENTER_GAP, // lascia spazio libero al centro
              boxSizing: 'border-box',
            }}>
              <div style={{
                width: '100%',
                height: CARD_HEIGHT,
                backgroundImage: `url(${CHARACTER_BACKGROUNDS[activeP1]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
                border: `2px solid ${theme.colors.goldSubtle}`,
                boxShadow: `0 0 50px ${P1_GLOW}, inset 0 0 80px rgba(0,0,0,0.5)`,
                transition: 'background-image 0.4s ease-in-out',
              }} />
            </div>

            {/* Card P2 — riempie quasi la metà destra, spinta verso l'esterno */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '32px',
              paddingLeft: CENTER_GAP,
              boxSizing: 'border-box',
            }}>
              <div style={{
                width: '100%',
                height: CARD_HEIGHT,
                backgroundImage: `url(${CHARACTER_BACKGROUNDS[activeP2]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
                border: `2px solid ${theme.colors.goldSubtle}`,
                boxShadow: `0 0 50px ${P2_GLOW}, inset 0 0 80px rgba(0,0,0,0.5)`,
                transition: 'background-image 0.4s ease-in-out',
              }} />
            </div>
          </>
        ) : (
          /* Single Player — una sola card centrata */
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: SINGLE_CARD_WIDTH,
              height: SINGLE_CARD_HEIGHT,
              backgroundImage: `url(${CHARACTER_BACKGROUNDS[activeP1]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '12px',
              border: `2px solid ${theme.colors.goldSubtle}`,
              boxShadow: `0 0 50px ${theme.colors.goldGlow}, inset 0 0 80px rgba(0,0,0,0.5)`,
              transition: 'background-image 0.4s ease-in-out',
            }} />
          </div>
        )}
      </div>

      {/* Dark Overlay per garantire la leggibilità della UI */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(5, 10, 20, 0)', // Modifica l'opacità per vedere più o meno lo sfondo
        zIndex: 1,
        pointerEvents: 'none'
      }} />
      {/* ─────────────────────────── */}


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
        <>
          {/* P1 side */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '40px 20px',
            zIndex: 2,
          }}>
            <h2 style={{
              fontFamily: theme.fonts.heading,
              fontSize: '24px',
              fontWeight: 700,
              color: theme.colors.gold,
              letterSpacing: '8px',
              margin: 0,
            }}>
              P1
            </h2>
            <p style={{
              fontFamily: theme.fonts.mono,
              fontSize: '10px',
              color: theme.colors.textMuted,
              letterSpacing: '2px',
              marginTop: '8px',
            }}>
              W, S + SPACE
            </p>

            {/* Spacer (il personaggio è mostrato dalla card sfondo) */}
            <div style={{ flex: 1 }} />

            {/* Nome P1 — appena sopra la card, a destra (verso il centro) */}
            <div style={{
              position: 'absolute',
              top: CARD_TOP,
              right: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              zIndex: 3,
              transform: `translateY(calc(-100% - 8px)) scale(${p1Confirmed ? 1.05 : 1})`,
              transformOrigin: 'bottom right',
              transition: 'all 0.3s ease',
            }}>
              <span style={{
                fontFamily: theme.fonts.heading,
                fontSize: 'clamp(22px, 2.6vw, 34px)',
                fontWeight: 700,
                color: theme.colors.gold,
                textShadow: `0 0 20px ${theme.colors.goldGlow}`,
                textTransform: 'uppercase',
                letterSpacing: '4px',
                transition: 'all 0.3s ease',
              }}>
                {activeP1}
              </span>
              {p1Confirmed && (
                <div style={{
                  marginTop: '8px',
                  fontFamily: theme.fonts.heading,
                  fontSize: '11px',
                  color: theme.colors.gold,
                  letterSpacing: '4px',
                  animation: 'fadeIn 0.3s ease-out',
                }}>
                  READY
                </div>
              )}
            </div>
          </div>

          {/* CENTER — Shared selection buttons */}
          <div style={{
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            zIndex: 5,
          }}>
            {CHARACTERS.map((char, index) => {
              const p1On = p1Index === index;
              const p2On = p2Index === index;

              return (
                <div
                  key={char}
                  style={{
                    width: '120px',
                    height: '59px',
                    position: 'relative',
                    cursor: 'default',
                  }}
                >
                  <img
                    src={CHARACTER_BUTTONS[char]}
                    alt={char}
                    style={{
                      width: '120px',
                      height: '59px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      transition: 'all 0.3s ease',
                      opacity: (p1On || p2On) ? 1 : 0.4,
                      filter: (p1On || p2On) ? 'none' : 'grayscale(0.8)',
                      border: `1px solid ${(p1On || p2On) ? theme.colors.gold : theme.colors.goldSubtle}`,
                      boxShadow: getSharedButtonGlow(index),
                    }}
                  />
                </div>
              );
            })}

            <p style={{
              fontFamily: theme.fonts.mono,
              fontSize: '9px',
              color: theme.colors.textMuted,
              letterSpacing: '1px',
              textAlign: 'center',
              lineHeight: 1.6,
              marginTop: '8px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '6px 12px',
              borderRadius: '4px'
            }}>
              <span style={{ color: P1_COLOR }}>P1</span> W/S + SPACE
              <br />
              <span style={{ color: P2_COLOR }}>P2</span> ↑/↓ + ENTER
            </p>
          </div>

          {/* P2 side */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '40px 20px',
            opacity: !p2Selectable ? 0.5 : 1,
            zIndex: 2,
          }}>
            <h2 style={{
              fontFamily: theme.fonts.heading,
              fontSize: '24px',
              fontWeight: 700,
              color: theme.colors.gold,
              letterSpacing: '8px',
              margin: 0,
            }}>
              {isAI ? 'CPU' : 'P2'}
            </h2>
            <p style={{
              fontFamily: theme.fonts.mono,
              fontSize: '10px',
              color: theme.colors.textMuted,
              letterSpacing: '2px',
              marginTop: '8px',
            }}>
              {p2Selectable ? '↑, ↓ + ENTER' : 'AUTO'}
            </p>

            {/* Spacer (il personaggio è mostrato dalla card sfondo) */}
            <div style={{ flex: 1 }} />

            {/* Nome P2 — appena sopra la card, a sinistra (verso il centro) */}
            <div style={{
              position: 'absolute',
              top: CARD_TOP,
              left: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              zIndex: 3,
              transform: `translateY(calc(-100% - 8px)) scale(${p2Confirmed ? 1.05 : 1})`,
              transformOrigin: 'bottom left',
              transition: 'all 0.3s ease',
            }}>
              <span style={{
                fontFamily: theme.fonts.heading,
                fontSize: 'clamp(22px, 2.6vw, 34px)',
                fontWeight: 700,
                color: theme.colors.gold,
                textShadow: `0 0 20px ${theme.colors.goldGlow}`,
                textTransform: 'uppercase',
                letterSpacing: '4px',
                transition: 'all 0.3s ease',
              }}>
                {activeP2}
              </span>
              {p2Confirmed && (
                <div style={{
                  marginTop: '8px',
                  fontFamily: theme.fonts.heading,
                  fontSize: '11px',
                  color: theme.colors.gold,
                  letterSpacing: '4px',
                  animation: 'fadeIn 0.3s ease-out',
                }}>
                  READY
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* SINGLE SELECT — una sola card centrata, logica come la doppia */
        <div style={{
          flex: 1,
          width: '100%',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Nome — appena sopra la card (centrato) */}
          <div style={{
            position: 'absolute',
            top: SINGLE_CARD_TOP,
            left: '50%',
            transform: 'translate(-50%, calc(-100% - 12px))',
            textAlign: 'center',
            zIndex: 3,
          }}>
            <span style={{
              fontFamily: theme.fonts.heading,
              fontSize: 'clamp(24px, 3vw, 40px)',
              fontWeight: 700,
              color: theme.colors.goldBright,
              textShadow: `0 0 20px ${theme.colors.goldGlow}`,
              textTransform: 'uppercase',
              letterSpacing: '6px',
              transition: 'all 0.3s ease',
            }}>
              {activeP1}
            </span>
          </div>

          {/* Selezione + comandi — appena sotto la card (centrati) */}
          <div style={{
            position: 'absolute',
            top: SINGLE_CARD_BOTTOM,
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 3,
          }}>
            {p1Confirmed && (
              <div style={{
                marginBottom: '16px',
                fontFamily: theme.fonts.heading,
                fontSize: '14px',
                color: theme.colors.gold,
                letterSpacing: '6px',
                animation: 'fadeIn 0.3s ease-out',
              }}>
                READY
              </div>
            )}

            <div style={{ display: 'flex', gap: '24px' }}>
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
                      cursor: p1Confirmed ? 'default' : 'pointer',
                      opacity: p1Confirmed && !isSelected ? 0.25 : 1,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <img
                      src={CHARACTER_BUTTONS[char]}
                      alt={char}
                      style={{
                        width: '140px',
                        height: '69px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        transition: 'all 0.3s ease',
                        opacity: active ? 1 : 0.5,
                        filter: active ? 'none' : 'grayscale(0.8)',
                        border: `1px solid ${active ? theme.colors.gold : theme.colors.goldSubtle}`,
                        boxShadow: active ? `0 0 20px ${theme.colors.goldGlow}` : 'none',
                        transform: active ? 'scale(1.05)' : 'scale(1)'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <p style={{
              marginTop: '24px',
              fontFamily: theme.fonts.mono,
              fontSize: '11px',
              color: theme.colors.textPrimary,
              letterSpacing: '2px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '8px 16px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            }}>
              A / D or ← / → — SPACE or ENTER
            </p>
          </div>
        </div>
      )}

      {launching && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.85)', // Più scuro al caricamento
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

      {!isFullscreen && (
        <FullscreenGate
          onEnter={enter}
          onLeave={onBack}
          kickAt={kickAt}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}