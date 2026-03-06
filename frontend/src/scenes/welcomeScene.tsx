import { useState } from 'react';
import { theme } from '../configs/theme';
import welcomeScene from '../assets/welcomeScene.png';

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
        justifyContent: 'flex-start',
        backgroundImage: `url(${welcomeScene})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={onStart}
    >
      {/* Titolo CLASH of OLYMPUS */}
      <div style={{
        marginTop: '75px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'titleFadeIn 2s ease-out',
      }}>
        <span style={{
          fontSize: 'clamp(80px, 12vw, 164px)',
          fontFamily: theme.fonts.heading,
          fontWeight: 700,
          color: theme.colors.gold,
          letterSpacing: '8px',
          textTransform: 'uppercase',
          lineHeight: 1,
          textShadow: `0 0 40px ${theme.colors.goldGlow}, 0 2px 4px rgba(0,0,0,0.8)`,
        }}>
          CLASH
        </span>

        <span style={{
          fontSize: 'clamp(28px, 4vw, 52px)',
          fontFamily: theme.fonts.heading,
          fontWeight: 400,
          color: theme.colors.goldDim,
          letterSpacing: '20px',
          textTransform: 'lowercase',
          lineHeight: 1,
          marginTop: '8px',
          marginBottom: '8px',
          textShadow: `0 0 30px ${theme.colors.goldGlow}, 0 2px 4px rgba(0,0,0,0.8)`,
        }}>
          of
        </span>

        <span style={{
          fontSize: 'clamp(80px, 12vw, 164px)',
          fontFamily: theme.fonts.heading,
          fontWeight: 700,
          color: theme.colors.gold,
          letterSpacing: '8px',
          textTransform: 'uppercase',
          lineHeight: 1,
          textShadow: `0 0 40px ${theme.colors.goldGlow}, 0 2px 4px rgba(0,0,0,0.8)`,
        }}>
          OLYMPUS
        </span>
      </div>

      {/* Sottotitolo */}
      <p style={{
        marginTop: '24px',
        fontFamily: theme.fonts.heading,
        fontSize: 'clamp(16px, 2.5vw, 22px)',
        letterSpacing: '10px',
        color: theme.colors.goldDark,
        textTransform: 'uppercase',
        textShadow: `0 0 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)`,
        animation: 'subtitleFadeIn 2s ease-out 0.5s both',
      }}>
        Hades against Zeus
      </p>

      {/* CTA */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          marginTop: 'auto',
          marginBottom: '80px',
          fontFamily: theme.fonts.heading,
          fontSize: 'clamp(48px, 2vw, 32px)',
          fontWeight: 500,
          letterSpacing: '6px',
          color: theme.colors.gold,
          textTransform: 'uppercase',
          transition: 'all 0.4s ease',
          boxShadow: `0 0 30px rgba(200, 170, 100, 0.15)`,
          textShadow: `0 0 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)`,
          animation: 'blinkFade 2s ease-in-out infinite',
        }}
      >
        Click everywhere for starting
      </div>

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
        @keyframes blinkFade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
