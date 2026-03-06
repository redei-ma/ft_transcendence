import { sectionTitleStyle } from '../styles/shared';
import { theme } from '../../configs/theme';
import { NAVBAR_HEIGHT } from '../components/Navbar';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  return (
    <div className="animate-fadeIn" style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}>
      {/* Hero */}
      <div id="section-game" style={{
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        background: `radial-gradient(ellipse at center top, ${theme.colors.goldSubtle} 0%, transparent 50%), ${theme.colors.bgDark}`,
        textAlign: "center", 
        scrollMarginTop: `${NAVBAR_HEIGHT}px`,
      }}>
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 72px)", 
          fontFamily: theme.fonts.heading,
          fontWeight: 900,
          background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold}, ${theme.colors.goldDark})`,
          WebkitBackgroundClip: "text", 
          WebkitTextFillColor: "transparent",
          letterSpacing: "6px", 
          lineHeight: 1.1, 
          marginBottom: "16px", 
          textTransform: "uppercase",
        }}>Clash of<br />Olympus</h1>
        <p style={{ 
          color: theme.colors.textSecondary, 
          fontFamily: theme.fonts.heading,
          fontSize: "14px", 
          letterSpacing: "4px", 
          textTransform: "uppercase", 
          marginBottom: "48px" 
        }}>
          An Isometric Mythological Brawler
        </p>
        <button className="btn-press" onClick={() => onNavigate("play")} style={{
          padding: "18px 64px",
          background: `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
          border: `2px solid ${theme.colors.goldBright}`, 
          borderRadius: "2px",
          color: theme.colors.bgDark, 
          fontFamily: theme.fonts.heading, 
          fontSize: "16px",
          fontWeight: 800, 
          letterSpacing: "4px", 
          textTransform: "uppercase", 
          cursor: "pointer",
          transition: "all 0.3s",
          boxShadow: `0 0 30px ${theme.colors.goldGlow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
          animation: "float 3s ease-in-out infinite",
        }}>Play Now</button>
      </div>

      {/* Characters */}
      <div id="section-characters" style={{
        padding: "80px 48px",
        background: `linear-gradient(180deg, ${theme.colors.bg} 0%, ${theme.colors.bgDark} 100%)`,
        borderTop: `1px solid ${theme.colors.border}`, 
        scrollMarginTop: `${NAVBAR_HEIGHT}px`,
      }}>
        <h2 style={sectionTitleStyle}>Choose Your Champion</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", maxWidth: "900px", margin: "0 auto" }}>
          {[
            { name: "ZEUS", emoji: "⚡", desc: "God of Thunder. Commands lightning-based AoE attacks that strike all who dare approach.", bg: "rgba(10,50,60,0.6)" },
            { name: "HADES", emoji: "🔥", desc: "Lord of the Underworld. Wields fire-based AoE attacks that consume enemies in flames.", bg: "rgba(60,20,20,0.3)" },
          ].map((c) => (
            <div key={c.name} style={{
              background: `linear-gradient(135deg, ${c.bg}, ${theme.colors.bgPanel})`,
              border: `1px solid ${theme.colors.border}`, 
              borderRadius: "4px",
              padding: "40px 32px", 
              textAlign: "center", 
              transition: "all 0.3s", 
              cursor: "pointer",
            }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.borderColor = theme.colors.gold; 
                e.currentTarget.style.transform = "translateY(-4px)"; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.borderColor = theme.colors.border; 
                e.currentTarget.style.transform = "translateY(0)"; 
              }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>{c.emoji}</div>
              <h3 style={{ fontFamily: theme.fonts.heading, color: theme.colors.goldBright, fontSize: "22px", fontWeight: 700, letterSpacing: "3px", marginBottom: "12px" }}>{c.name}</h3>
              <p style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.mono, fontSize: "12px", lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div id="section-commands" style={{
        padding: "80px 48px", 
        borderTop: `1px solid ${theme.colors.border}`,
        maxWidth: "700px",
        margin: "0 auto", 
        scrollMarginTop: `${NAVBAR_HEIGHT}px`,
      }}>
        <h2 style={sectionTitleStyle}>Controls</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {[
            { key: "W A S D", action: "Movement" },
            { key: "SPACE", action: "Attack (AoE Burst)" },
            { key: "SHIFT", action: "Defense Stance" },
            { key: "ESC", action: "Pause Menu" },
          ].map((c) => (
            <div key={c.key} style={{
              display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px",
              background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: "4px",
            }}>
              <kbd style={{
                padding: "6px 12px", background: theme.colors.bgDark,
                border: `1px solid ${theme.colors.textMuted}`, borderRadius: "3px",
                color: theme.colors.gold, fontFamily: theme.fonts.heading, fontSize: "12px", 
                fontWeight: 700, letterSpacing: "1px", whiteSpace: "nowrap",
              }}>{c.key}</kbd>
              <span style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.mono, fontSize: "13px" }}>{c.action}</span>
            </div>
          ))}
        </div>
      </div>

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