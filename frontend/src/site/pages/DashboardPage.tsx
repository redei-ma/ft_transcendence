import { sectionTitleStyle } from '../styles/shared';
import { theme } from '../../configs/theme';
import { NAVBAR_HEIGHT } from '../components/Navbar';
import * as Icons from '../components/Icons';

import zeusDescImg from '../../assets/ZeusDescription.png';
import adeDescImg from '../../assets/AdeDescription.png';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

// ⚡ Componente di supporto per renderizzare i tasti in modo ordinato
const ControlRow = ({ keys, action, stacked = false }: { keys: string[], action: string, stacked?: boolean }) => (
  <div style={{
    display: "flex", 
    flexDirection: stacked ? "column" : "row", 
    alignItems: stacked ? "flex-start" : "center", 
    gap: stacked ? "8px" : "16px", 
    padding: "12px 16px",
    background: theme.colors.bgDark, 
    border: `1px solid ${theme.colors.border}`, 
    borderRadius: "4px",
  }}>
    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
      {keys.map((k, i) => (
        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <kbd style={{
            padding: "4px 10px", background: theme.colors.bgPanel,
            border: `1px solid ${theme.colors.textMuted}`, borderRadius: "3px",
            color: theme.colors.gold, fontFamily: theme.fonts.heading, fontSize: "11px", 
            fontWeight: 700, letterSpacing: "1px", whiteSpace: "nowrap",
          }}>{k}</kbd>
          {i < keys.length - 1 && <span style={{color: theme.colors.textMuted, fontSize: "12px", fontFamily: theme.fonts.mono}}>+</span>}
        </span>
      ))}
    </div>
    <span style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.mono, fontSize: "12px" }}>{action}</span>
  </div>
);


export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  return (
    <div className="animate-fadeIn" style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}>
      
      {/* ================= SECTION CON BACKGROUND VIDEO ================= */}
      <div id="section-game" style={{
        position: "relative",
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        overflow: "hidden",
        scrollMarginTop: `${NAVBAR_HEIGHT}px`,
      }}>
        
        {/* Sfondo Video Assoluto */}
        <video 
          src="/videos/video1.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />

        {/* Overlay Scuro */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          inset: 0,
          background: `linear-gradient(180deg, rgba(6, 14, 20, 0.4) 0%, rgba(6, 14, 20, 0.7) 70%, ${theme.colors.bgDark} 100%)`,
          zIndex: 1,
          pointerEvents: "none"
        }} />

        {/* Contenuto in Primo Piano */}
        <div className="animate-slideUp" style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "24px",
          width: "100%"
        }}>
          <h1 style={{
            fontSize: "clamp(42px, 8vw, 86px)", 
            fontFamily: theme.fonts.heading,
            fontWeight: 900,
            background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold}, ${theme.colors.goldDark})`,
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            letterSpacing: "6px", 
            lineHeight: 1.1, 
            marginBottom: "16px", 
            textTransform: "uppercase",
            textShadow: "0 4px 20px rgba(0,0,0,0.8)"
          }}>Clash of<br />Olympus</h1>
          
          <p style={{ 
            color: theme.colors.textSecondary, 
            fontFamily: theme.fonts.heading,
            fontSize: "clamp(12px, 2vw, 16px)", 
            letterSpacing: "6px", 
            textTransform: "uppercase", 
            marginBottom: "48px",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)"
          }}>
            An Isometric Mythological Brawler
          </p>
          
          {/* BOTTONE TONDO */}
          <button className="btn-press" onClick={() => onNavigate("play")} style={{
            marginTop: "20px",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: `radial-gradient(circle at center, rgba(232,213,163,0.15) 0%, rgba(62,52,26,0.6) 80%, rgba(6,14,20,0.9) 100%)`,
            border: `2px solid ${theme.colors.goldBright}`,
            color: theme.colors.goldBright, 
            fontFamily: theme.fonts.heading, 
            fontSize: "14px",
            fontWeight: 800, 
            letterSpacing: "2px", 
            textTransform: "uppercase", 
            cursor: "pointer",
            transition: "all 0.3s",
            boxShadow: `0 0 50px ${theme.colors.goldGlow}, inset 0 0 30px rgba(232,213,163,0.2)`,
            backdropFilter: "blur(4px)",
            animation: "orbPulse 3s ease-in-out infinite",
          }}>
            <Icons.Zap size={36} />
            <span>Play<br/>Now</span>
          </button>
        </div>
      </div>
      {/* ========================================================================= */}

      {/* ================= CHARACTERS SECTION ===================== */}
      <div id="section-characters" style={{
        padding: "80px 48px",
        background: `linear-gradient(180deg, ${theme.colors.bgDark} 0%, ${theme.colors.bg} 100%)`,
        borderTop: `1px solid ${theme.colors.border}`, 
        scrollMarginTop: `${NAVBAR_HEIGHT}px`,
      }}>
        <h2 style={sectionTitleStyle}>CHARACTERS</h2>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "40px", 
          maxWidth: "1400px", 
          margin: "0 auto" 
        }}>
          {[
            { name: "HADES", img: adeDescImg },
            { name: "ZEUS", img: zeusDescImg },
          ].map((c) => (
            <div key={c.name} style={{
              background: theme.colors.bgPanel,
              border: `1px solid ${theme.colors.border}`, 
              borderRadius: "8px",
              overflow: "hidden",
              transition: "all 0.3s ease", 
              cursor: "pointer",
              boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
              display: "flex",
            }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.borderColor = theme.colors.gold; 
                e.currentTarget.style.transform = "translateY(-6px)"; 
                e.currentTarget.style.boxShadow = `0 15px 40px rgba(0,0,0,0.7), 0 0 25px ${theme.colors.goldGlow}`; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.borderColor = theme.colors.border; 
                e.currentTarget.style.transform = "translateY(0)"; 
                e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.5)`; 
              }}>
              
              <img 
                src={c.img} 
                alt={`${c.name} Character Card`} 
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover"
                }} 
              />
            </div>
          ))}
        </div>
      </div>
      {/* ========================================================================= */}

      {/* ================= CONTROLS SECTION ===================== */}
      <div id="section-commands" style={{
        padding: "80px 48px", 
        borderTop: `1px solid ${theme.colors.border}`,
        maxWidth: "1100px", // ⚡ Allargato per fare spazio a 2 colonne
        margin: "0 auto", 
        scrollMarginTop: `${NAVBAR_HEIGHT}px`,
      }}>
        <h2 style={sectionTitleStyle}>Controls</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
          
          {/* PANNELLO 1: Single Player / Online */}
          <div style={{ background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: "8px", padding: "24px" }}>
            <h3 style={{ fontFamily: theme.fonts.heading, color: theme.colors.goldBright, fontSize: "16px", letterSpacing: "2px", marginBottom: "20px", textTransform: "uppercase", textAlign: "center", borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: "12px" }}>
              Single Player / Online
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <ControlRow keys={["W A S D"]} action="Movement" />
              <ControlRow keys={["SPACE"]} action="Melee Attack" />
              <ControlRow keys={["SHIFT", "L-CLICK"]} action="Aim & Shoot Spell" />
              <ControlRow keys={["CTRL"]} action="Defense Stance" />
              <ControlRow keys={["ENTER"]} action="Open Game Chat" />
            </div>
          </div>

          {/* PANNELLO 2: Local Game */}
          <div style={{ background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: "8px", padding: "24px" }}>
            <h3 style={{ fontFamily: theme.fonts.heading, color: theme.colors.goldBright, fontSize: "16px", letterSpacing: "2px", marginBottom: "20px", textTransform: "uppercase", textAlign: "center", borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: "12px" }}>
              Local Game (Shared Keyboard)
            </h3>
            
            <div style={{ display: "flex", gap: "16px" }}>
              {/* Player 1 */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontFamily: theme.fonts.heading, color: theme.colors.zeus, fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase", textAlign: "center", marginBottom: "8px", fontWeight: "bold" }}>Player 1</span>
                <ControlRow keys={["W A S D"]} action="Move" stacked />
                <ControlRow keys={["SPACE"]} action="Melee" stacked />
                <ControlRow keys={["SHIFT"]} action="Spell" stacked />
                <ControlRow keys={["CTRL"]} action="Defense" stacked />
              </div>
              
              {/* Divisore */}
              <div style={{ width: "1px", background: theme.colors.border }} />

              {/* Player 2 */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontFamily: theme.fonts.heading, color: theme.colors.ade, fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase", textAlign: "center", marginBottom: "8px", fontWeight: "bold" }}>Player 2</span>
                <ControlRow keys={["ARROWS"]} action="Move" stacked />
                <ControlRow keys={["P"]} action="Melee" stacked />
                <ControlRow keys={["O"]} action="Spell" stacked />
                <ControlRow keys={["I"]} action="Defense" stacked />
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* ========================================================================= */}

      {/* Footer */}
      <footer style={{
        padding: "24px 48px", borderTop: `1px solid ${theme.colors.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: "11px", letterSpacing: "1px" }}>
          CLASH OF OLYMPUS © 2026
        </span>
      </footer>
    </div>
  );
}