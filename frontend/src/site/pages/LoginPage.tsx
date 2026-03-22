import { useState, useCallback } from 'react';
import { inputStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as authService from '../services/authService';
import welcomeScene from '../../assets/welcomeScene.png';
import { theme } from '../../configs/theme';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ username: "", email: "", password: "", totp: "" });

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        
        // ⚡ SE LA 2FA È GIÀ VISIBILE, VERIFICHIAMO SOLO IL CODICE
        if (show2fa) {
          const { ok, data } = await authService.verify2fa(formData.totp);
          if (ok) {
            onLogin(); // Codice corretto, entra!
          } else {
            setError(data.message || data.error || "Invalid 2FA code");
          }
          setLoading(false);
          return;
        }

        // ⚡ ALTRIMENTI, FACCIAMO IL LOGIN NORMALE
        const { ok, data } = await authService.login(formData.username, formData.password);
        
        // Se il backend ci dice che serve la 2FA (tramite un flag o uno status code)
        if (data.requires2fa || data.message === '2FA required') { 
          setShow2fa(true); 
          setLoading(false); 
          return; 
        }
        
        if (ok) { 
          onLogin(); 
        } else { 
          setError(data.message || data.error || "Login failed"); 
        }

      } else if (mode === "register") {
        const { ok, data } = await authService.register(formData.username, formData.email, formData.password);
        if (ok) { setMode("login"); setFormData({ username: "", email: "", password: "", totp: "" }); }
        else { setError(data.error || data.message || "Registration failed"); }

      } else if (mode === "forgot") {
        const ok = await authService.forgotPassword(formData.email);
        if (ok) setMode("login");
        else setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }, [mode, formData, show2fa, onLogin]);

  const switchMode = (m: typeof mode) => { setMode(m); setError(""); setShow2fa(false); };

  return (
    <div className="animate-fadeIn" style={{
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: theme.colors.bgDark,
      backgroundImage: `radial-gradient(circle at center, rgba(200,170,110,0.4) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(10,200,185,0.04) 0%, transparent 90%), url(${welcomeScene})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: "relative", 
      overflow: "hidden",
    }}>
      {/* Star particles */}
      <div style={{
        position: "absolute", 
        inset: 0, 
        pointerEvents: "none",
        background: `radial-gradient(1px 1px at 20% 30%, ${theme.colors.goldGlow}, transparent),
          radial-gradient(1px 1px at 80% 70%, ${theme.colors.goldSubtle}, transparent),
          radial-gradient(1px 1px at 50% 50%, rgba(200,170,110,0.15), transparent)`,
        backgroundSize: "200px 200px, 300px 300px, 250px 250px",
      }} />

      {/* Orb container */}
      <div style={{
        width: "440px", 
        height: "440px", 
        borderRadius: "50%",
        background: `radial-gradient(circle at center, ${theme.colors.bgPanel}00 20%, ${theme.colors.bgDark}00 70%)`,
        transform: 'translateY(70px)',
        border: `1px solid ${theme.colors.border}`, 
        animation: "orbPulse 4s ease-in-out infinite",
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "60px 50px", 
        position: "relative",
      }}>
        <h1 style={{
          fontSize: mode === "login" ? "22px" : "20px", 
          fontWeight: 700,
          fontFamily: theme.fonts.heading,
          background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.goldDark}, ${theme.colors.goldDark})`,
          WebkitBackgroundClip: "text", 
          WebkitTextFillColor: "transparent",
          marginBottom: "4px", 
          letterSpacing: "3px", 
          textAlign: "center", 
          textTransform: "uppercase",
        }}>
          {mode === "login" && "Clash of Olympus"}
          {mode === "register" && "Join the Arena"}
          {mode === "forgot" && "Reset Password"}
        </h1>
        <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.bgDark, fontSize: "13px", letterSpacing: "2px", marginBottom: "28px", textTransform: "uppercase" }}>
          {mode === "login" && "Ade against Zeus"}
          {mode === "register" && "Forge Your Legend"}
          {mode === "forgot" && "Recover Access"}
        </p>

        {error && (
          <div style={{
            width: "100%", 
            padding: "8px 12px", 
            marginBottom: "12px",
            background: "rgba(232,64,87,0.15)", 
            border: `1px solid ${theme.colors.dead}`,
            borderRadius: "2px", 
            color: theme.colors.dead, 
            fontFamily: theme.fonts.mono,
            fontSize: "13px", 
            textAlign: "center",
          }}>{error}</div>
        )}

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
          {(mode === "login" || mode === "register") && (
            <input className="input-glow" type="text" placeholder="Username" value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={inputStyle} />
          )}
          {(mode === "register" || mode === "forgot") && (
            <input className="input-glow" type="email" placeholder="Email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
          )}
          {mode !== "forgot" && (
            <div style={{ position: "relative" }}>
              <input className="input-glow" type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ ...inputStyle, paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: theme.colors.textMuted, cursor: "pointer", padding: "4px", display: "flex" }}>
                {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
              </button>
            </div>
          )}
          {show2fa && mode === "login" && (
            <div className="animate-slideUp">
              <input className="input-glow" type="text" placeholder="2FA Code" value={formData.totp}
                onChange={(e) => setFormData({ ...formData, totp: e.target.value })}
                style={{ ...inputStyle, textAlign: "center", letterSpacing: "8px", fontSize: "20px" }} maxLength={6} />
            </div>
          )}

          {/* Submit */}
          <button className="btn-press" type="button" onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: "12px",
            background: loading ? theme.colors.textMuted : `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
            border: "none", borderRadius: "2px", color: theme.colors.goldDark,
            fontFamily: theme.fonts.heading, fontSize: "13px", fontWeight: 700,
            letterSpacing: "2px", textTransform: "uppercase",
            cursor: loading ? "wait" : "pointer", transition: "all 0.2s", marginTop: "4px",
          }}>
            {loading ? "..." : mode === "login" ? "Enter" : mode === "register" ? "Register" : "Send Reset Link"}
          </button>

          {/* Google OAuth */}
          {mode !== "forgot" && (
            <button type="button" className="btn-press" onClick={authService.redirectToGoogle} style={{
              width: "100%", padding: "10px", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${theme.colors.border}`, borderRadius: "2px",
              color: theme.colors.goldDark, fontFamily: theme.fonts.heading, fontSize: "11px",
              fontWeight: 600, letterSpacing: "1px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.2s",
            }}>
              <Icons.Google size={16} /> Continue with Google
            </button>
          )}
        </div>

        {/* Mode switch links */}
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          {mode === "login" && (
            <>
              <button onClick={() => switchMode("register")} style={{ background: "none", border: "none", color: theme.colors.bgDark, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Create an account</button>
              <span style={{ color: theme.colors.textMuted, margin: "0 8px" }}>·</span>
              <button onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", color: theme.colors.bgDark, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Forgot password?</button>
            </>
          )}
          {mode === "register" && (
            <button onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: theme.colors.zeus, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Already have an account? Sign in</button>
          )}
          {mode === "forgot" && (
            <button onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: theme.colors.zeus, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Back to login</button>
          )}
        </div>
      </div>
    </div>
  );
}