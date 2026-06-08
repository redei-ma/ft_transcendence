import { sectionTitleStyle } from '../styles/shared';
import { theme } from '../../configs/theme';
import { NAVBAR_HEIGHT } from '../components/Navbar';
import { useState } from 'react';
import * as Icons from '../components/Icons';
import zeusDescImg from '../../assets/images/ZeusDescription.png';
import adeDescImg from '../../assets/images/AdeDescription.png';
import zeusDetailImg from '../../assets/images/ZeusDetail.png';
import adeDetailImg from '../../assets/images/AdeDetail.png';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

//  Componente di supporto per renderizzare i tasti in modo ordinato
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
  const [footerModal, setFooterModal] = useState<'privacy' | 'terms' | null>(null);
  const [charModal, setCharModal] = useState<string | null>(null);
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
            <div key={c.name} onClick={() => setCharModal(c.name)} style={{
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
              <ControlRow keys={["SHIFT"]} action="Press/Release for enable or disable Aim-Mode" />
              <ControlRow keys={["L-CLICK"]} action="Shoot a Spell at click location (Aim-Mode enabled ONLY)" />
              <ControlRow keys={["C"]} action="Defense Stance" />
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
                <ControlRow keys={["SHIFT"]} action="Spell (Where you look at)" stacked />
                <ControlRow keys={["C"]} action="Defense" stacked />
              </div>

              {/* Divisore */}
              <div style={{ width: "1px", background: theme.colors.border }} />

              {/* Player 2 */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontFamily: theme.fonts.heading, color: theme.colors.ade, fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase", textAlign: "center", marginBottom: "8px", fontWeight: "bold" }}>Player 2</span>
                <ControlRow keys={["ARROWS"]} action="Move" stacked />
                <ControlRow keys={["P"]} action="Melee" stacked />
                <ControlRow keys={["O"]} action="Spell (Where you look at)" stacked />
                <ControlRow keys={["I"]} action="Defense" stacked />
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* ========================================================================= */}

      {/* Character Detail Modal */}
      {charModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setCharModal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: theme.colors.bgPanel, border: `1px solid ${theme.colors.gold}`,
            borderRadius: "4px", padding: "24px", maxWidth: "700px", width: "90%",
            maxHeight: "85vh", overflowY: "auto",
            boxShadow: `0 0 40px ${theme.colors.goldGlow}`,
            textAlign: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: theme.fonts.heading, color: theme.colors.goldBright, fontSize: "24px", letterSpacing: "4px" }}>
                {charModal}
              </h2>
              <button onClick={() => setCharModal(null)} style={{
                background: "none", border: "none", color: theme.colors.textMuted, cursor: "pointer",
              }}><Icons.X size={20} /></button>
            </div>
            <img
              src={charModal === "ZEUS" ? zeusDetailImg : adeDetailImg}
              alt={charModal}
              style={{ width: "100%", borderRadius: "4px" }}
            />
          </div>
        </div>
      )}

    {/* Footer */}
      <footer style={{
        padding: "24px 48px", borderTop: `1px solid ${theme.colors.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: "24px" }}>
          <span onClick={() => setFooterModal('privacy')} style={{
            fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: "11px",
            letterSpacing: "1px", cursor: "pointer", transition: "color 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.gold}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textMuted}
          >PRIVACY POLICY</span>
          <span onClick={() => setFooterModal('terms')} style={{
            fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: "11px",
            letterSpacing: "1px", cursor: "pointer", transition: "color 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.gold}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textMuted}
          >TERMS OF SERVICE</span>
        </div>
        <span style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: "11px", letterSpacing: "1px" }}>
          CLASH OF OLYMPUS © 2026
        </span>
      </footer>

      {/* Footer Modal */}
      {footerModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setFooterModal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: theme.colors.bgPanel, border: `1px solid ${theme.colors.gold}`,
            borderRadius: "4px", padding: "40px", maxWidth: "600px", width: "90%",
            maxHeight: "80vh", overflowY: "auto",
            boxShadow: `0 0 40px ${theme.colors.goldGlow}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontFamily: theme.fonts.heading, color: theme.colors.goldBright, fontSize: "20px", letterSpacing: "2px" }}>
                {footerModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h2>
              <button onClick={() => setFooterModal(null)} style={{
                background: "none", border: "none", color: theme.colors.textMuted, cursor: "pointer",
              }}><Icons.X size={20} /></button>
            </div>
            <div style={{ fontFamily: theme.fonts.mono, fontSize: "12px", color: theme.colors.textSecondary, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {footerModal === 'privacy' ? PRIVACY_TEXT : TERMS_TEXT}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMAIL_USER = import.meta.env.VITE_EMAIL_USER || 'email not currently available';


// Costanti contenenti il testo per il Modal Footer
const PRIVACY_TEXT =

`1. Introduction

This application ("the Service") respects your privacy and is committed to protecting your personal data in accordance with applicable laws, including the General Data Protection Regulation (GDPR).

2. Data We Collect

We may collect the following personal data:
  • Username
  • Email address
  • Password (stored securely as a hash)
  • OAuth account data (e.g., Google account ID and email)
  • Game-related data (scores, matches, statistics)
  • Technical data such as IP address and login activity

3. Purpose of Data Processing

We process your data for the following purposes:
  • To create and manage your account
  • To authenticate users and maintain sessions
  • To provide gameplay features and statistics
  • To ensure security and prevent abuse

4. Legal Basis

Your data is processed on the basis of:
  • Performance of a contract (providing the Service)
  • Legitimate interest (security and fraud prevention)

5. Data Storage and Security

  • Passwords are securely hashed using industry-standard methods
  • Authentication tokens are stored in HTTP-only cookies
  • Reasonable technical measures are used to protect your data

6. Data Retention

  • We retain your data as long as your account is active.
  • We may delete inactive accounts after an extended period of inactivity.
  • You may request deletion of your account at any time.

7. Your Rights

Under GDPR, you have the right to:
  • Access your personal data
  • Correct inaccurate data
  • Delete your data ("right to be forgotten")

These rights can be exercised through your account settings or by contacting us.

8. Cookies

This Service uses strictly necessary cookies for authentication purposes.

These include:
  • Access token cookies
  • Refresh token cookies

These cookies are required for the proper functioning of the Service and do not require user consent.

9. Third-Party Services

We may use third-party services such as:
  • Google OAuth for authentication

These services may process your data according to their own privacy policies.

10. Contact

For any privacy-related requests, contact:
${EMAIL_USER}

11. Changes

We may update this Privacy Policy at any time. Continued use of the Service implies acceptance of the updated policy.`;

const TERMS_TEXT =

`1. Acceptance of Terms

By using this Service, you agree to these Terms of Service.

2. User Accounts

  • You are responsible for maintaining the confidentiality of your account credentials.
  • You agree to provide accurate information when registering.

3. Acceptable Use

You agree not to:
  • Use the Service for unlawful purposes
  • Attempt to gain unauthorized access
  • Exploit bugs or cheat in the game
  • Harass or abuse other users

4. Service Availability

  • The Service is provided "as is" without guarantees of availability or performance.
  • We may modify or discontinue the Service at any time.

5. Account Termination

  • We reserve the right to suspend or delete accounts that violate these terms.
  • Users may delete their account at any time.

6. Limitation of Liability

We are not responsible for:
  • Data loss
  • Service interruptions
  • Any damages arising from the use of the Service

7. Intellectual Property

All content and code of the Service remain the property of the developer unless otherwise stated.

8. Governing Law

These Terms are governed by the laws of Italy.

9. Changes

We may update these Terms at any time. Continued use of the Service implies acceptance of the updated Terms.`;
