// import { useEffect, useState } from 'react';
// import { theme } from '../configs/theme';
// import { useGameSocket } from '../hooks/useGameSocket';

// interface QueueSceneProps {
//   onMatchFound: () => void;
//   onCancel: () => void;
// }

// export default function QueueScene({ onMatchFound, onCancel }: QueueSceneProps) {
//   const { world } = useGameSocket();
//   const [elapsed, setElapsed] = useState(0);

//   // Timer che conta i secondi in coda
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setElapsed(prev => prev + 1);
//     }, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   // Quando riceviamo map-emit dal socket, la partita è pronta
//   useEffect(() => {
//     if (world) {
//       onMatchFound();
//     }
//   }, [world, onMatchFound]);

//   const minutes = Math.floor(elapsed / 60);
//   const seconds = elapsed % 60;
//   const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

//   return (
//     <div style={{
//       position: 'fixed',
//       inset: 0,
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.bg,
//       overflow: 'hidden',
//     }}>
//       {/* Background */}
//       <div style={{
//         position: 'absolute',
//         inset: 0,
//         background: `radial-gradient(ellipse at 50% 40%, rgba(80, 40, 0, 0.1) 0%, transparent 60%)`,
//         pointerEvents: 'none',
//       }} />

//       <h1 style={{
//         fontFamily: theme.fonts.heading,
//         fontSize: '32px',
//         fontWeight: 700,
//         color: theme.colors.gold,
//         letterSpacing: '8px',
//         textTransform: 'uppercase',
//         textShadow: `0 0 30px ${theme.colors.goldGlow}`,
//         animation: 'pulse 2s ease-in-out infinite',
//       }}>
//         Searching...
//       </h1>

//       <p style={{
//         marginTop: '24px',
//         fontFamily: theme.fonts.mono,
//         fontSize: '24px',
//         color: theme.colors.goldDim,
//         letterSpacing: '4px',
//       }}>
//         {timeStr}
//       </p>

//       <p style={{
//         marginTop: '12px',
//         fontFamily: theme.fonts.heading,
//         fontSize: '12px',
//         color: theme.colors.textMuted,
//         letterSpacing: '3px',
//       }}>
//         Waiting for an opponent
//       </p>

//       {/* Cancel button */}
//       <button
//         onClick={onCancel}
//         style={{
//           marginTop: '60px',
//           padding: '12px 40px',
//           background: 'none',
//           border: `1px solid ${theme.colors.goldSubtle}`,
//           borderRadius: '2px',
//           color: theme.colors.goldDim,
//           fontFamily: theme.fonts.heading,
//           fontSize: '12px',
//           letterSpacing: '4px',
//           textTransform: 'uppercase',
//           cursor: 'pointer',
//           transition: 'all 0.3s ease',
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
//         Cancel
//       </button>

//       <style>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; }
//           50% { opacity: 0.5; }
//         }
//       `}</style>
//     </div>
//   );
// }
import { useEffect, useState } from 'react';
import { theme } from '../configs/theme';

interface QueueSceneProps {
  onMatchFound: () => void;
  onCancel: () => void;
  world: any;
}

export default function QueueScene({ onMatchFound, onCancel, world }: QueueSceneProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Quando riceviamo map-emit, la partita è pronta
  useEffect(() => {
    if (world) onMatchFound();
  }, [world, onMatchFound]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
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

      {/* Main box */}
      <div style={{
        border: `1px solid ${theme.colors.goldSubtle}`,
        padding: '60px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(5, 5, 8, 0.9)',
        position: 'relative',
      }}>
        {/* Corner decorations */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
          const isTop = corner.includes('top');
          const isLeft = corner.includes('left');
          return (
            <div key={corner} style={{
              position: 'absolute',
              top: isTop ? '-1px' : 'auto',
              bottom: !isTop ? '-1px' : 'auto',
              left: isLeft ? '-1px' : 'auto',
              right: !isLeft ? '-1px' : 'auto',
              width: '16px',
              height: '16px',
              borderTop: isTop ? `2px solid ${theme.colors.goldDim}` : 'none',
              borderBottom: !isTop ? `2px solid ${theme.colors.goldDim}` : 'none',
              borderLeft: isLeft ? `2px solid ${theme.colors.goldDim}` : 'none',
              borderRight: !isLeft ? `2px solid ${theme.colors.goldDim}` : 'none',
            }} />
          );
        })}

        <h1 style={{
          fontFamily: theme.fonts.heading,
          fontSize: '28px',
          fontWeight: 700,
          color: theme.colors.gold,
          letterSpacing: '8px',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: `0 0 30px ${theme.colors.goldGlow}`,
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          Searching
        </h1>

        {/* Decorative line */}
        <div style={{
          marginTop: '16px',
          width: '80px',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${theme.colors.goldMuted}, transparent)`,
        }} />

        {/* Timer */}
        <p style={{
          marginTop: '28px',
          fontFamily: theme.fonts.mono,
          fontSize: '32px',
          color: theme.colors.gold,
          letterSpacing: '6px',
          margin: '28px 0 0',
        }}>
          {timeStr}
        </p>

        <p style={{
          marginTop: '12px',
          fontFamily: theme.fonts.heading,
          fontSize: '11px',
          color: theme.colors.textMuted,
          letterSpacing: '4px',
          textTransform: 'uppercase',
        }}>
          Waiting for an opponent
        </p>

        {/* Animated dots */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          gap: '8px',
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: '4px',
              height: '4px',
              backgroundColor: theme.colors.goldDim,
              borderRadius: '50%',
              animation: `dotPulse 1.5s ease-in-out ${i * 0.3}s infinite`,
            }} />
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          style={{
            marginTop: '40px',
            padding: '10px 36px',
            background: 'none',
            border: `1px solid ${theme.colors.goldSubtle}`,
            color: theme.colors.goldMuted,
            fontFamily: theme.fonts.heading,
            fontSize: '11px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = theme.colors.gold;
            e.currentTarget.style.borderColor = theme.colors.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.colors.goldMuted;
            e.currentTarget.style.borderColor = theme.colors.goldSubtle;
          }}
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}