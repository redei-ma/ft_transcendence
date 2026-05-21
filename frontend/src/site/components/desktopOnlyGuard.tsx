import { useState, useEffect } from 'react';
import { theme } from '../../configs/theme';
import welcomeScene from '../../assets/welcomeScene.png';

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 600;

export default function DesktopOnlyGuard({ children }: { children: React.ReactNode }) {
  const [blockedReason, setBlockedReason] = useState<'device' | 'size' | null>(null);

  useEffect(() => {
    // --- Check tipo dispositivo: eseguito UNA SOLA VOLTA al mount ---
    // Non va nel resize listener perché il tipo di dispositivo non cambia
    // mentre si usa il sito (altrimenti il canvas che si monta triggera resize
    // e il guard blocca erroneamente i laptop touch).
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua);
    // (pointer: coarse) AND (hover: none) = touch puro senza mouse (telefono/tablet).
    // I laptop touch hanno hover: hover → non bloccati.
    const isCoarsePointer = window.matchMedia("(pointer: coarse) and (hover: none)").matches;
    // iPad Pro che si finge un Mac
    const isMacTouch = ua.includes("mac") && navigator.maxTouchPoints > 2;

    console.log('[Guard] Device check:', { isMobileUA, isCoarsePointer, isMacTouch, ua });

    if (isMobileUA || isCoarsePointer || isMacTouch) {
      setBlockedReason('device');
      return; // Dispositivo bloccato — inutile aggiungere il listener resize
    }

    // --- Check dimensione finestra: eseguito al mount E al resize ---
    // Serve per garantire che la mappa venga visualizzata correttamente.
    // I confini della mappa dipendono dalla dimensione del canvas.
    const checkSize = () => {
      const tooSmall = window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT;
      console.log('[Guard] Size check:', { w: window.innerWidth, h: window.innerHeight, tooSmall });
      setBlockedReason(tooSmall ? 'size' : null);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  if (blockedReason) {
    const isDevice = blockedReason === 'device';
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
          backgroundColor: "rgba(0,0,0,0.6)"
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
            {isDevice ? 'Desktop Only' : 'Enlarge Window'}
          </h1>
          <p style={{
            fontFamily: theme.fonts.heading,
            color: theme.colors.goldDim,
            fontSize: "14px",
            letterSpacing: "2px",
            textTransform: "uppercase"
          }}>
            {isDevice
              ? 'Physical keyboard required'
              : `Minimum ${MIN_WIDTH}×${MIN_HEIGHT}px required`}
          </p>
        </div>
      </div>
    );
  }

  // Se passa tutti i controlli, carica il gioco!
  return <>{children}</>;
}
