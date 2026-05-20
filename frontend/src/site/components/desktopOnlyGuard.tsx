import { useState, useEffect } from 'react';
import { theme } from '../../configs/theme';
import welcomeScene from '../../assets/welcomeScene.png';

export default function DesktopOnlyGuard({ children }: { children: React.ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      
      // 1. User Agent generico per mobile
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua);
      
      // 2. Il dispositivo usa principalmente il touch (es. smartphone/tablet)
      // (pointer: coarse) AND (hover: none) = touch puro senza mouse (phone/tablet).
      // I laptop touch hanno hover: hover → non bloccati anche se hanno il touch.
      const isCoarsePointer = window.matchMedia("(pointer: coarse) and (hover: none)").matches;

      // 3. "Trappola iPad": l'iPad Pro si finge un Mac, ma ha il touch
      const isMacTouch = ua.includes("mac") && navigator.maxTouchPoints > 2;

      if (isMobileUA || isCoarsePointer || isMacTouch) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (isBlocked) {
    return (
      <div className="animate-fadeIn" style={{
        position: "fixed", inset: 0, 
        display: "flex", flexDirection: "column", 
        alignItems: "center", justifyContent: "center",
        backgroundColor: theme.colors.bgDark,
        backgroundImage: `radial-gradient(circle at center, rgba(200,170,110,0.4) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(10,200,185,0.04) 0%, transparent 90%), url(${welcomeScene})`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        zIndex: 9999
      }}>
        {/* Filtro scuro per far risaltare il testo */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(1px 1px at 20% 30%, ${theme.colors.goldGlow}, transparent), radial-gradient(1px 1px at 80% 70%, ${theme.colors.goldSubtle}, transparent)`,
          backgroundSize: "200px 200px, 300px 300px",
          backgroundColor: "rgba(0,0,0,0.6)" // Leggero oscuramento dell'immagine di sfondo
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px" }}>
          {/* Stesso stile esatto del titolo in LoginPage */}
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
            Desktop Only
          </h1>
          <p style={{ 
            fontFamily: theme.fonts.heading, 
            color: theme.colors.goldDim, 
            fontSize: "14px", 
            letterSpacing: "2px", 
            textTransform: "uppercase" 
          }}>
            Physical keyboard required
          </p>
        </div>
      </div>
    );
  }

  // Se passa tutti i controlli, carica il gioco!
  return <>{children}</>;
}