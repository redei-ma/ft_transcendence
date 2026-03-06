// import { useState, useEffect, useRef } from 'react';
// import { matchmakingSocket } from '../services/matchmakingSocket';
// import { GameEvents } from '../game/game.events';
// import { MatchMode, MatchType } from '../types/game.types';
// import { theme } from '../configs/theme';
// import zeusImg from '../assets/Zeus_selection.png';
// import adeImg from '../assets/Ade_selection.jpg';

// type Character = 'zeus' | 'ade';

// interface CharacterSelectSceneProps {
//   mode: MatchMode;
//   userDbId: string;
//   onConfirm: (p1: Character, p2: Character) => void;
//   onBack: () => void;
// }

// const CHARACTERS: Character[] = ['zeus', 'ade'];
// const CHARACTER_IMAGES: Record<Character, string> = {
//   zeus: zeusImg,
//   ade: adeImg,
// };

// const P1_COLOR = theme.colors.zeus;
// const P1_GLOW = theme.colors.zeusGlow;
// const P2_COLOR = theme.colors.ade;
// const P2_GLOW = theme.colors.adeGlow;

// export default function CharacterSelectScene({
//   mode,
//   userDbId,
//   onConfirm,
//   onBack,
// }: CharacterSelectSceneProps) {
//   const isLocal = mode === MatchMode.LOCAL;
//   const isAI = mode === MatchMode.AI;
//   const isSplitScreen = isLocal || isAI;

//   const [p1Index, setP1Index] = useState(0);
//   const [p2Index, setP2Index] = useState(1);
//   const [p1Confirmed, setP1Confirmed] = useState(false);
//   const [p2Confirmed, setP2Confirmed] = useState(false);
//   const [p1Hover, setP1Hover] = useState<number | null>(null);
//   const [p2Hover, setP2Hover] = useState<number | null>(null);
//   const [launching, setLaunching] = useState(false);
  
//   const launchingRef = useRef(false);
//   const p2Selectable = isLocal || isAI;

//   useEffect(() => {
//     if (!isSplitScreen) setP2Confirmed(true);
//   }, [isSplitScreen]);

//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       const key = e.key.toLowerCase();

//       if (isSplitScreen) {
//         if (!p1Confirmed) {
//           if (key === 'w' || key === 's') {
//             e.preventDefault();
//             setP1Index(prev => prev === 0 ? 1 : 0);
//           }
//           if (key === ' ') {
//             e.preventDefault();
//             setP1Confirmed(true);
//           }
//         }
//         if (p2Selectable && !p2Confirmed) {
//           if (key === 'arrowup' || key === 'arrowdown') {
//             e.preventDefault();
//             setP2Index(prev => prev === 0 ? 1 : 0);
//           }
//           if (key === 'enter') {
//             e.preventDefault();
//             setP2Confirmed(true);
//           }
//         }
//       } else {
//         if (!p1Confirmed) {
//           if (key === 'a' || key === 'd' || key === 'arrowleft' || key === 'arrowright') {
//             e.preventDefault();
//             setP1Index(prev => prev === 0 ? 1 : 0);
//           }
//           if (key === ' ' || key === 'enter') {
//             e.preventDefault();
//             setP1Confirmed(true);
//           }
//         }
//       }

//       if (key === 'escape') onBack();
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [p1Confirmed, p2Confirmed, p2Selectable, isSplitScreen, onBack]);
  
//   // Launch — emit to Leonardo via matchmaking socket
//   useEffect(() => {
//     if (!p1Confirmed) return;
//     if (isSplitScreen && !p2Confirmed) return;
//     if (launchingRef.current) return;

//     launchingRef.current = true;
//     setLaunching(true);

//     const timer = setTimeout(() => {
//       const finalP1 = CHARACTERS[p1Index];
//       const finalP2 = CHARACTERS[p2Index];
      
      
//     const payload = {
//       characterName: isSplitScreen ? [finalP1, finalP2] : [finalP1],
//       rank: (mode === MatchMode.RANKED || mode === MatchMode.UNRANKED) ? 500 : null,
//       rankRange: (mode === MatchMode.RANKED || mode === MatchMode.UNRANKED) ? 100 : null,
//       matchType: MatchType.FFA,
//       matchMode: mode,
//       isAiPlayer: isAI,
//     };
      
//       let event: GameEvents;
//       if (isLocal) event = GameEvents.JOIN_LOCAL;
//       else if (isAI) event = GameEvents.JOIN_AI;
//       else if (mode === MatchMode.RANKED) event = GameEvents.JOIN_RANKED;
//       else event = GameEvents.JOIN_UNRANKED;

//       console.log(`[CharSelect] Emitting ${event}:`, payload);
//       matchmakingSocket.emit(event, payload);

//       onConfirm(finalP1, finalP2);
//     }, 600);

//     return () => clearTimeout(timer);
//   }, [p1Confirmed, p2Confirmed]);

//   function getSharedButtonGlow(index: number): string {
//     const p1On = p1Index === index;
//     const p2On = p2Index === index;

//     if (p1On && p2On) {
//       return `
//         -20px 0 16px -2px ${P1_GLOW},
//         20px 0 16px -2px ${P2_GLOW}
//       `;
//     }
//     if (p1On) return `-10px 0 16px ${P1_GLOW}`;
//     if (p2On) return `10px 0 16px ${P2_GLOW}`;
//     return 'none';
//   }

//   return (
//     <div style={{
//       position: 'fixed',
//       inset: 0,
//       display: 'flex',
//       flexDirection: isSplitScreen ? 'row' : 'column',
//       alignItems: isSplitScreen ? 'stretch' : 'center',
//       backgroundColor: theme.colors.bg,
//       overflow: 'hidden',
//     }}>
//       <div style={{
//         position: 'absolute',
//         inset: 0,
//         background: `radial-gradient(ellipse at 50% 40%, rgba(80, 40, 0, 0.1) 0%, transparent 60%)`,
//         pointerEvents: 'none',
//       }} />

//       <button
//         onClick={onBack}
//         style={{
//           position: 'absolute',
//           top: '24px',
//           left: '24px',
//           background: 'none',
//           border: `1px solid ${theme.colors.goldSubtle}`,
//           borderRadius: '2px',
//           color: theme.colors.goldDim,
//           fontFamily: theme.fonts.heading,
//           fontSize: '11px',
//           letterSpacing: '3px',
//           padding: '8px 20px',
//           cursor: 'pointer',
//           transition: 'all 0.3s ease',
//           zIndex: 10,
//         }}
//         onMouseEnter={(e) => {
//           e.currentTarget.style.color = theme.colors.gold;
//           e.currentTarget.style.borderColor = theme.colors.borderHover;
//         }}
//         onMouseLeave={(e) => {
//           e.currentTarget.style.color = theme.colors.goldDim;
//           e.currentTarget.style.borderColor = theme.colors.goldSubtle;
//         }}
//       >
//         BACK
//       </button>

//       {isSplitScreen ? (
//         <>
//           {/* P1 side */}
//           <div style={{
//             flex: 1,
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             justifyContent: 'center',
//             position: 'relative',
//             padding: '40px 20px',
//           }}>
//             <h2 style={{
//               fontFamily: theme.fonts.heading,
//               fontSize: '24px',
//               fontWeight: 700,
//               color: theme.colors.gold,
//               letterSpacing: '8px',
//               margin: 0,
//             }}>
//               P1
//             </h2>
//             <p style={{
//               fontFamily: theme.fonts.mono,
//               fontSize: '10px',
//               color: theme.colors.textMuted,
//               letterSpacing: '2px',
//               marginTop: '8px',
//             }}>
//               W, S + SPACE
//             </p>

//             <div style={{
//               flex: 1,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               width: '100%',
//               position: 'relative',
//             }}>
//               <div style={{
//                 position: 'absolute',
//                 width: '200px',
//                 height: '200px',
//                 borderRadius: '50%',
//                 background: `radial-gradient(circle, ${P1_GLOW} 0%, transparent 70%)`,
//                 transition: 'all 0.5s ease',
//               }} />
//               <div style={{
//                 display: 'flex',
//                 flexDirection: 'column',
//                 alignItems: 'center',
//                 zIndex: 2,
//                 transform: p1Confirmed ? 'scale(1.05)' : 'scale(1)',
//                 transition: 'all 0.3s ease',
//               }}>
//                 <span style={{
//                   fontFamily: theme.fonts.heading,
//                   fontSize: 'clamp(36px, 5vw, 56px)',
//                   fontWeight: 700,
//                   color: theme.colors.gold,
//                   textShadow: `0 0 30px ${theme.colors.goldGlow}`,
//                   textTransform: 'uppercase',
//                   letterSpacing: '6px',
//                   transition: 'all 0.3s ease',
//                 }}>
//                   {CHARACTERS[p1Hover ?? p1Index]}
//                 </span>
//                 <div style={{
//                   marginTop: '20px',
//                   width: '120px',
//                   height: '160px',
//                   border: `1px dashed ${theme.colors.goldSubtle}`,
//                   borderRadius: '4px',
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   color: theme.colors.textMuted,
//                   fontFamily: theme.fonts.mono,
//                   fontSize: '10px',
//                 }}>
//                   3D MODEL
//                 </div>
//                 {p1Confirmed && (
//                   <div style={{
//                     marginTop: '16px',
//                     fontFamily: theme.fonts.heading,
//                     fontSize: '12px',
//                     color: theme.colors.gold,
//                     letterSpacing: '4px',
//                     animation: 'fadeIn 0.3s ease-out',
//                   }}>
//                     READY
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* CENTER — Shared selection buttons */}
//           <div style={{
//             width: '280px',
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             justifyContent: 'center',
//             gap: '32px',
//             zIndex: 5,
//           }}>
//             {CHARACTERS.map((char, index) => {
//               const p1On = p1Index === index;
//               const p2On = p2Index === index;

//               return (
//                 <div
//                   key={char}
//                   style={{
//                     width: '120px',
//                     height: '59px',
//                     position: 'relative',
//                     cursor: 'default',
//                   }}
//                 >
//                   <img
//                     src={CHARACTER_IMAGES[char]}
//                     alt={char}
//                     style={{
//                       width: '120px',
//                       height: '59px',
//                       objectFit: 'contain',
//                       transition: 'all 0.3s ease',
//                       opacity: (p1On || p2On) ? 1 : 0.4,
//                       filter: (p1On || p2On) ? 'none' : 'grayscale(0.6)',
//                       border: `0.5px solid ${theme.colors.goldSubtle}`,
//                       boxShadow: getSharedButtonGlow(index),
//                     }}
//                   />
//                 </div>
//               );
//             })}

//             <p style={{
//               fontFamily: theme.fonts.mono,
//               fontSize: '9px',
//               color: theme.colors.textMuted,
//               letterSpacing: '1px',
//               textAlign: 'center',
//               lineHeight: 1.6,
//               marginTop: '8px',
//             }}>
//               <span style={{ color: P1_COLOR }}>P1</span> W/S + SPACE
//               <br />
//               <span style={{ color: P2_COLOR }}>P2</span> ↑/↓ + ENTER
//             </p>
//           </div>

//           {/* P2 side */}
//           <div style={{
//             flex: 1,
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             justifyContent: 'center',
//             position: 'relative',
//             padding: '40px 20px',
//             opacity: !p2Selectable ? 0.5 : 1,
//           }}>
//             <h2 style={{
//               fontFamily: theme.fonts.heading,
//               fontSize: '24px',
//               fontWeight: 700,
//               color: theme.colors.gold,
//               letterSpacing: '8px',
//               margin: 0,
//             }}>
//               {isAI ? 'CPU' : 'P2'}
//             </h2>
//             <p style={{
//               fontFamily: theme.fonts.mono,
//               fontSize: '10px',
//               color: theme.colors.textMuted,
//               letterSpacing: '2px',
//               marginTop: '8px',
//             }}>
//               {p2Selectable ? '↑, ↓ + ENTER' : 'AUTO'}
//             </p>

//             <div style={{
//               flex: 1,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               width: '100%',
//               position: 'relative',
//             }}>
//               <div style={{
//                 position: 'absolute',
//                 width: '200px',
//                 height: '200px',
//                 borderRadius: '50%',
//                 background: `radial-gradient(circle, ${P2_GLOW} 0%, transparent 70%)`,
//                 transition: 'all 0.5s ease',
//               }} />
//               <div style={{
//                 display: 'flex',
//                 flexDirection: 'column',
//                 alignItems: 'center',
//                 zIndex: 2,
//                 transform: p2Confirmed ? 'scale(1.05)' : 'scale(1)',
//                 transition: 'all 0.3s ease',
//               }}>
//                 <span style={{
//                   fontFamily: theme.fonts.heading,
//                   fontSize: 'clamp(36px, 5vw, 56px)',
//                   fontWeight: 700,
//                   color: theme.colors.gold,
//                   textShadow: `0 0 30px ${theme.colors.goldGlow}`,
//                   textTransform: 'uppercase',
//                   letterSpacing: '6px',
//                   transition: 'all 0.3s ease',
//                 }}>
//                   {CHARACTERS[p2Hover ?? p2Index]}
//                 </span>
//                 <div style={{
//                   marginTop: '20px',
//                   width: '120px',
//                   height: '160px',
//                   border: `1px dashed ${theme.colors.goldSubtle}`,
//                   borderRadius: '4px',
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   color: theme.colors.textMuted,
//                   fontFamily: theme.fonts.mono,
//                   fontSize: '10px',
//                 }}>
//                   3D MODEL
//                 </div>
//                 {p2Confirmed && (
//                   <div style={{
//                     marginTop: '16px',
//                     fontFamily: theme.fonts.heading,
//                     fontSize: '12px',
//                     color: theme.colors.gold,
//                     letterSpacing: '4px',
//                     animation: 'fadeIn 0.3s ease-out',
//                   }}>
//                     READY
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </>
//       ) : (
//         /* SINGLE SELECT */
//         <div style={{
//           flex: 1,
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: 'center',
//           justifyContent: 'center',
//           padding: '40px',
//         }}>
//           <span style={{
//             fontFamily: theme.fonts.heading,
//             fontSize: '13px',
//             fontWeight: 400,
//             color: theme.colors.goldDim,
//             textTransform: 'uppercase',
//             letterSpacing: '6px',
//             transition: 'all 0.3s ease',
//           }}>
//             {CHARACTERS[p1Hover ?? p1Index]}
//           </span>

//           <div style={{
//             marginTop: '16px',
//             width: '180px',
//             height: '260px',
//             border: `1px dashed ${theme.colors.goldSubtle}`,
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             color: theme.colors.textMuted,
//             fontFamily: theme.fonts.mono,
//             fontSize: '10px',
//             position: 'relative',
//           }}>
//             3D MODEL
//             <div style={{
//               position: 'absolute',
//               width: '280px',
//               height: '280px',
//               borderRadius: '50%',
//               background: `radial-gradient(circle, ${theme.colors.goldGlow} 0%, transparent 70%)`,
//               pointerEvents: 'none',
//             }} />
//           </div>

//           {p1Confirmed && (
//             <div style={{
//               marginTop: '16px',
//               fontFamily: theme.fonts.heading,
//               fontSize: '14px',
//               color: theme.colors.gold,
//               letterSpacing: '6px',
//               animation: 'fadeIn 0.3s ease-out',
//             }}>
//               READY
//             </div>
//           )}

//           <div style={{
//             display: 'flex',
//             gap: '24px',
//             marginTop: '24px',
//           }}>
//             {CHARACTERS.map((char, index) => {
//               const isSelected = p1Index === index;
//               const isHov = p1Hover === index;
//               const active = isSelected || isHov;

//               return (
//                 <div
//                   key={char}
//                   onClick={() => { if (!p1Confirmed) setP1Index(index); }}
//                   onMouseEnter={() => { if (!p1Confirmed) setP1Hover(index); }}
//                   onMouseLeave={() => { if (!p1Confirmed) setP1Hover(null); }}
//                   onDoubleClick={() => { if (!p1Confirmed) { setP1Index(index); setP1Confirmed(true); } }}
//                   style={{
//                     cursor: p1Confirmed ? 'default' : 'pointer',
//                     opacity: p1Confirmed && !isSelected ? 0.25 : 1,
//                     transition: 'all 0.3s ease',
//                   }}
//                 >
//                   <img
//                     src={CHARACTER_IMAGES[char]}
//                     alt={char}
//                     style={{
//                       width: '120px',
//                       height: '59px',
//                       objectFit: 'contain',
//                       transition: 'all 0.3s ease',
//                       opacity: active ? 1 : 0.4,
//                       filter: active ? 'none' : 'grayscale(0.6)',
//                       border: `0.5px solid ${theme.colors.goldSubtle}`,
//                       boxShadow: active ? `0 0 16px ${theme.colors.goldGlow}` : 'none',
//                     }}
//                   />
//                 </div>
//               );
//             })}
//           </div>

//           <p style={{
//             marginTop: '16px',
//             fontFamily: theme.fonts.mono,
//             fontSize: '10px',
//             color: theme.colors.textMuted,
//             letterSpacing: '2px',
//           }}>
//             A / D or ← / → — SPACE or ENTER
//           </p>
//         </div>
//       )}

//       {launching && (
//         <div style={{
//           position: 'absolute',
//           inset: 0,
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           backgroundColor: 'rgba(0, 0, 0, 0.5)',
//           zIndex: 100,
//           animation: 'fadeIn 0.4s ease-out',
//         }}>
//           <h2 style={{
//             fontFamily: theme.fonts.heading,
//             fontSize: '42px',
//             color: theme.colors.gold,
//             letterSpacing: '12px',
//             textShadow: `0 0 40px ${theme.colors.goldGlow}`,
//             animation: 'scaleIn 0.5s ease-out',
//           }}>
//             FIGHT
//           </h2>
//         </div>
//       )}

//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
//         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
//         @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
//       `}</style>
//     </div>
//   );
// }
import { useState, useEffect, useRef } from 'react';
import { matchmakingSocket } from '../services/matchmakingSocket';
import { GameEvents } from '../game/game.events';
import { MatchMode, MatchType } from '../types/game.types';
import { theme } from '../configs/theme';
import zeusImg from '../assets/ZeusSelection.png';
import adeImg from '../assets/AdeSelection.png'; // Cambia in .png se necessario

type Character = 'zeus' | 'ade';

interface CharacterSelectSceneProps {
  mode: MatchMode;
  userDbId: string;
  onConfirm: (p1: Character, p2: Character) => void;
  onBack: () => void;
}

const CHARACTERS: Character[] = ['zeus', 'ade'];
const CHARACTER_IMAGES: Record<Character, string> = {
  zeus: zeusImg,
  ade: adeImg,
};

const P1_COLOR = theme.colors.zeus;
const P1_GLOW = theme.colors.zeusGlow;
const P2_COLOR = theme.colors.ade;
const P2_GLOW = theme.colors.adeGlow;

export default function CharacterSelectScene({
  mode,
  userDbId,
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
  const p2Selectable = isLocal || isAI;

  // Calcolo dei personaggi attualmente "attivi" (hover o selezionati) per gli sfondi
  const activeP1 = CHARACTERS[p1Hover ?? p1Index];
  const activeP2 = CHARACTERS[p2Hover ?? p2Index];

  useEffect(() => {
    if (!isSplitScreen) setP2Confirmed(true);
  }, [isSplitScreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [p1Confirmed, p2Confirmed, p2Selectable, isSplitScreen, onBack]);
  
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

      console.log(`[CharSelect] Emitting ${event}:`, payload);
      matchmakingSocket.emit(event, payload);

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
            {/* Sfondo Metà Sinistra (P1) */}
            <div style={{
              flex: 1,
              backgroundImage: `url(${CHARACTER_IMAGES[activeP1]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'background-image 0.4s ease-in-out',
              borderRight: `2px solid ${theme.colors.borderHover}`
            }} />
            {/* Sfondo Metà Destra (P2) */}
            <div style={{
              flex: 1,
              backgroundImage: `url(${CHARACTER_IMAGES[activeP2]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'background-image 0.4s ease-in-out',
            }} />
          </>
        ) : (
          /* Sfondo Intero (Single Player) */
          <div style={{
            flex: 1,
            backgroundImage: `url(${CHARACTER_IMAGES[activeP1]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            transition: 'background-image 0.4s ease-in-out',
          }} />
        )}
      </div>

      {/* Dark Overlay per garantire la leggibilità della UI */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(5, 10, 20, 0.75)', // Modifica l'opacità per vedere più o meno lo sfondo
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
                background: `radial-gradient(circle, ${P1_GLOW} 0%, transparent 70%)`,
                transition: 'all 0.5s ease',
              }} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                transform: p1Confirmed ? 'scale(1.05)' : 'scale(1)',
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
                  {activeP1}
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
                  color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.mono,
                  fontSize: '10px',
                  backgroundColor: 'rgba(0,0,0,0.4)', // Sfondo semi-scuro per il box modello
                  backdropFilter: 'blur(2px)'
                }}>
                  3D MODEL
                </div>
                {p1Confirmed && (
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
                    src={CHARACTER_IMAGES[char]}
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
                background: `radial-gradient(circle, ${P2_GLOW} 0%, transparent 70%)`,
                transition: 'all 0.5s ease',
              }} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                transform: p2Confirmed ? 'scale(1.05)' : 'scale(1)',
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
                  {activeP2}
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
                  color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.mono,
                  fontSize: '10px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(2px)'
                }}>
                  3D MODEL
                </div>
                {p2Confirmed && (
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
          </div>
        </>
      ) : (
        /* SINGLE SELECT */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          zIndex: 2,
        }}>
          <span style={{
            fontFamily: theme.fonts.heading,
            fontSize: '16px', // Leggermente più grande per visibilità
            fontWeight: 700,
            color: theme.colors.goldBright,
            textTransform: 'uppercase',
            letterSpacing: '8px',
            transition: 'all 0.3s ease',
            textShadow: `0 0 20px ${theme.colors.goldGlow}`
          }}>
            {activeP1}
          </span>

          <div style={{
            marginTop: '16px',
            width: '180px',
            height: '260px',
            border: `1px dashed ${theme.colors.goldSubtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.textPrimary,
            fontFamily: theme.fonts.mono,
            fontSize: '10px',
            position: 'relative',
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            borderRadius: '8px',
          }}>
            3D MODEL
            <div style={{
              position: 'absolute',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.colors.goldGlow} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
          </div>

          {p1Confirmed && (
            <div style={{
              marginTop: '16px',
              fontFamily: theme.fonts.heading,
              fontSize: '14px',
              color: theme.colors.gold,
              letterSpacing: '6px',
              animation: 'fadeIn 0.3s ease-out',
            }}>
              READY
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '24px',
            marginTop: '32px',
          }}>
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
                    src={CHARACTER_IMAGES[char]}
                    alt={char}
                    style={{
                      width: '140px', // Leggermente più larghi in single player
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
            borderRadius: '4px'
          }}>
            A / D or ← / → — SPACE or ENTER
          </p>
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}