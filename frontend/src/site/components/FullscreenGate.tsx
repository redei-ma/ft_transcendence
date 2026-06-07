import { useState } from 'react';
import { theme } from '../../configs/theme';
import welcomeScene from '../../assets/images/welcomeScene.png';

export function FullscreenGate({
  onEnter,
  onLeave,
}: {
  onEnter: () => void;
  onLeave: () => void;
}) {
    const [hoverEnter, setHoverEnter] = useState(false);
    const [hoverLeave, setHoverLeave] = useState(false);
    
  return (
    <div className="animate-fadeIn" style={{
      position: "fixed", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: theme.colors.bgPanel,
    //   backgroundImage: `radial-gradient(circle at center, rgba(200,170,110,0.4) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(10,200,185,0.04) 0%, transparent 90%), url(${welcomeScene})`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      zIndex: 9999
    }}>
      {/* Filtro scuro + particelle, identico al DesktopOnlyGuard */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(1px 1px at 20% 30%, ${theme.colors.goldGlow}, transparent), radial-gradient(1px 1px at 80% 70%, ${theme.colors.goldSubtle}, transparent)`,
        backgroundSize: "200px 200px, 300px 300px",
        backgroundColor: "rgba(0,0,0,0.6)"
      }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px" }}>
        {/* Stesso titolo gold di LoginPage / DesktopOnlyGuard */}
        <h1 style={{
          fontSize: "clamp(32px, 6vw, 64px)",
          fontWeight: 700,
          fontFamily: theme.fonts.heading,
          background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.goldDark})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "16px",
          letterSpacing: "4px",
          textTransform: "uppercase",
        }}>
          WAIT A MINUTE!
        </h1>

        <p style={{
          fontFamily: theme.fonts.heading,
          color: theme.colors.gold,
          fontSize: "14px",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "40px"
        }}>
          You need to eneble the full-screen mode to continue in the game. Click the button below
        </p>

        {/* CTA: il click qui è ciò che il browser richiede per il fullscreen */}
        <button
          onClick={() => onEnter()}
          onMouseEnter={() => setHoverEnter(true)}
          onMouseLeave={() => setHoverEnter(false)}
          style={{
            cursor: "pointer",
            padding: "14px 44px",
            fontFamily: theme.fonts.heading,
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            borderRadius: "2px",
            border: `1px solid ${theme.colors.goldBright}`,
            color: hoverEnter ? theme.colors.bgDark : theme.colors.goldBright,
            background: hoverEnter
              ? `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.goldDark})`
              : "transparent",
            boxShadow: hoverEnter ? `0 0 24px ${theme.colors.goldBright}` : "none",
            transition: "all 0.25s ease",
          }}
        >
            ENABLE FULL-SCREEN
        </button>

        {/* Warning sul kick all'uscita */}
        <p style={{
          fontFamily: theme.fonts.heading,
          color: theme.colors.gold,
          fontSize: "11px",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginTop: "28px",
          opacity: 0.7
        }}>
          This warning is gonna hunt you every time you disable the full-screen mode in a match. You can leave if you want
        </p>

        <button
          onClick={onLeave}
          onMouseEnter={() => setHoverLeave(true)}
          onMouseLeave={() => setHoverLeave(false)}
          style={{
            marginTop: '16px',
            padding: '8px 26px',
            color: hoverLeave ? theme.colors.ade : theme.colors.goldBright,
            background: hoverLeave
              ? `linear-gradient(180deg, ${theme.colors.goldDark}, ${theme.colors.goldDark})`
              : "transparent",
            border: `1px solid ${theme.colors.border}`,
            boxShadow: hoverLeave ? `0 0 24px ${theme.colors.ade}` : "none",
            fontFamily: theme.fonts.heading,
            fontSize: '16px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
        >
          LEAVE
        </button>
      </div>
    </div>
  );
}