import { useState } from 'react';
import { theme } from '../configs/theme';

interface WelcomeSceneProps {
  onStart: () => void;
}

export default function WelcomeScene({ onStart }: WelcomeSceneProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.bg,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={onStart}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 40%, rgba(80, 40, 0, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 50% 60%, rgba(0, 40, 80, 0.1) 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        top: '2%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '200px',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${theme.colors.goldMuted}, transparent)`,
      }} />

      <h1 style={{
        fontSize: 'clamp(48px, 8vw, 96px)',
        fontFamily: theme.fonts.heading,
        fontWeight: 700,
        color: theme.colors.gold,
        textAlign: 'center',
        letterSpacing: '12px',
        textTransform: 'uppercase',
        margin: 0,
        lineHeight: 1.1,
        textShadow: `0 0 40px ${theme.colors.goldGlow}, 0 2px 4px rgba(0,0,0,0.8)`,
        animation: 'titleFadeIn 2s ease-out',
      }}>
        CLASH
        <br />
        <span style={{
          fontSize: '0.4em',
          letterSpacing: '20px',
          color: theme.colors.goldDim,
          fontWeight: 400,
        }}>
          OF
        </span>
        <br />
        OLYMPUS
      </h1>

      <p style={{
        marginTop: '40px',
        fontFamily: theme.fonts.heading,
        fontSize: '14px',
        letterSpacing: '8px',
        color: theme.colors.goldDim,
        textTransform: 'uppercase',
        animation: 'subtitleFadeIn 2s ease-out 0.5s both',
      }}>
        Ade contro Zeus
      </p>

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          marginTop: '80px',
          padding: '16px 60px',
          border: `1px solid ${hovered ? theme.colors.goldDim : theme.colors.goldSubtle}`,
          borderRadius: '2px',
          fontFamily: theme.fonts.heading,
          fontSize: '13px',
          letterSpacing: '6px',
          color: hovered ? theme.colors.gold : theme.colors.goldDim,
          textTransform: 'uppercase',
          transition: 'all 0.4s ease',
          boxShadow: hovered ? `0 0 30px rgba(200, 170, 100, 0.15)` : 'none',
          animation: 'enterFadeIn 2s ease-out 1s both',
        }}
      >
        Enter the Arena
      </div>

      <div style={{
        position: 'absolute',
        bottom: '30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '200px',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${theme.colors.goldMuted}, transparent)`,
      }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        @keyframes titleFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes subtitleFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes enterFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}