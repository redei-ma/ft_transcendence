import { useState, useCallback, useEffect } from 'react';
import { inputStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as authService from '../services/authService';
import welcomeScene from '../../assets/welcomeScene.png';
import { theme } from '../../configs/theme';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const [formData, setFormData] = useState({ 
    username: "", email: "", password: "", confirmPassword: "", totp: "", resetToken: "" 
  });

  // ⚡ SE L'UTENTE APRE IL LINK "reset-password.html?token=..."
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setMode("reset");
      setFormData(prev => ({ ...prev, resetToken: token }));
      // Pulisce l'URL visivamente (opzionale)
      window.history.replaceState({}, document.title, "/"); 
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (mode === "login") {
        if (show2fa) {
          const { ok, data } = await authService.verify2fa(formData.totp);
          if (ok) return onLogin();
          setError(data.message || data.error || "Invalid 2FA code");
        } else {
          const { ok, data } = await authService.login(formData.username, formData.password);
          
          if (data.requires2fa || data.message === '2FA required') { 
            setShow2fa(true); 
            setLoading(false); 
            return; 
          }
          if (ok) return onLogin();
          
          setError(data.message || data.error || "Login failed");
        }

      } else if (mode === "register") {
        const { ok, data } = await authService.register(formData.username, formData.email, formData.password);
        if (ok) { 
          setSuccessMsg("Registrazione completata! Controlla l'email per verificare l'account.");
          setMode("login"); 
          setFormData(prev => ({...prev, password: ""}));
        }
        else setError(data.error || data.message || "Registration failed");

      } else if (mode === "forgot") {
        const ok = await authService.forgotPassword(formData.email);
        if (ok) setSuccessMsg("Se l'email esiste, ti abbiamo inviato un link per resettare la password.");
        else setError("Errore nell'invio dell'email.");

      } else if (mode === "reset") {
        const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (formData.password !== formData.confirmPassword) {
          setError("Le password non combaciano.");
          setLoading(false); return;
        }
        if (!pwdRegex.test(formData.password)) {
          setError("La password deve contenere min 8 car., maiuscola, minuscola, numero e simbolo speciale.");
          setLoading(false); return;
        }

        const result = await authService.resetPassword(formData.resetToken, formData.password);
        if (result.ok) {
          setSuccessMsg("Password resettata con successo! Ora puoi accedere.");
          setMode("login");
        } else {
          setError(result.message || "Errore nel reset della password. Token scaduto?");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }, [mode, formData, show2fa, onLogin]);

  // RESEND VERIFICATION
  const handleResend = async () => {
    if (!formData.email) return setError("Inserisci la tua email per ricevere il link.");
    setLoading(true);
    const result = await authService.resendVerification(formData.email);
    if (result.ok) setSuccessMsg("Se l'account esiste, l'email di verifica è stata inviata nuovamente!");
    else setError(result.message || "Errore nell'invio dell'email.");
    setLoading(false);
  };

  const switchMode = (m: typeof mode) => { setMode(m); setError(""); setSuccessMsg(""); setShow2fa(false); };

  return (
    <div className="animate-fadeIn" style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: theme.colors.bgDark,
      backgroundImage: `radial-gradient(circle at center, rgba(200,170,110,0.4) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(10,200,185,0.04) 0%, transparent 90%), url(${welcomeScene})`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(1px 1px at 20% 30%, ${theme.colors.goldGlow}, transparent), radial-gradient(1px 1px at 80% 70%, ${theme.colors.goldSubtle}, transparent)`,
        backgroundSize: "200px 200px, 300px 300px",
      }} />

      <div style={{
        width: "440px", borderRadius: "50%",
        background: `radial-gradient(circle at center, ${theme.colors.bgPanel}00 20%, ${theme.colors.bgDark}00 70%)`,
        transform: 'translateY(70px)', border: `1px solid ${theme.colors.border}`, 
        animation: "orbPulse 4s ease-in-out infinite", display: "flex", flexDirection: "column", 
        alignItems: "center", justifyContent: "center", padding: "60px 50px", position: "relative",
      }}>
        <h1 style={{
          fontSize: "20px", fontWeight: 700, fontFamily: theme.fonts.heading,
          background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.goldDark})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: "4px", letterSpacing: "3px", textAlign: "center", textTransform: "uppercase",
        }}>
          {mode === "login" && "Clash of Olympus"}
          {mode === "register" && "Join the Arena"}
          {mode === "forgot" && "Reset Password"}
          {mode === "reset" && "Nuova Password"}
        </h1>

        {successMsg && (
          <div style={{ width: "100%", padding: "8px 12px", marginBottom: "12px", background: "rgba(168,198,108,0.15)", border: `1px solid ${theme.colors.hpHigh}`, borderRadius: "2px", color: theme.colors.hpHigh, fontFamily: theme.fonts.mono, fontSize: "12px", textAlign: "center" }}>
            {successMsg}
          </div>
        )}

        {error && (
          <div style={{ width: "100%", padding: "8px 12px", marginBottom: "12px", background: "rgba(232,64,87,0.15)", border: `1px solid ${theme.colors.dead}`, borderRadius: "2px", color: theme.colors.dead, fontFamily: theme.fonts.mono, fontSize: "12px", textAlign: "center" }}>
            {error}
            {error.toLowerCase().includes("verify your email") && (
              <button onClick={handleResend} style={{ display: 'block', margin: '8px auto 0', padding: '4px 8px', background: 'none', border: `1px solid ${theme.colors.dead}`, color: theme.colors.textPrimary, cursor: 'pointer', fontSize: '11px' }}>Re-invia email</button>
            )}
          </div>
        )}

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
          {(mode === "login" || mode === "register") && (
            <input className="input-glow" type="text" placeholder="Email / Username" value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={inputStyle} />
          )}
          {(mode === "register" || mode === "forgot") && (
            <input className="input-glow" type="email" placeholder="Email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
          )}
          {(mode === "login" || mode === "register" || mode === "reset") && (
            <div style={{ position: "relative" }}>
              <input className="input-glow" type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ ...inputStyle, paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: theme.colors.textMuted, cursor: "pointer", padding: "4px", display: "flex" }}>
                {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
              </button>
            </div>
          )}
          {mode === "reset" && (
            <input className="input-glow" type="password" placeholder="Conferma Password" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} style={inputStyle} />
          )}
          {show2fa && mode === "login" && (
            <div className="animate-slideUp">
              <input className="input-glow" type="text" placeholder="2FA Code" value={formData.totp}
                onChange={(e) => setFormData({ ...formData, totp: e.target.value })}
                style={{ ...inputStyle, textAlign: "center", letterSpacing: "8px", fontSize: "20px" }} maxLength={6} />
            </div>
          )}

          <button className="btn-press" type="button" onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: "12px",
            background: loading ? theme.colors.textMuted : `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
            border: "none", borderRadius: "2px", color: theme.colors.goldDark, fontFamily: theme.fonts.heading, fontSize: "13px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", cursor: loading ? "wait" : "pointer", transition: "all 0.2s", marginTop: "4px",
          }}>
            {loading ? "..." : mode === "login" ? "Enter" : mode === "register" ? "Register" : mode === "forgot" ? "Send Link" : "Reset Pwd"}
          </button>

          {mode !== "forgot" && mode !== "reset" && (
            <button type="button" className="btn-press" onClick={authService.redirectToGoogle} style={{
              width: "100%", padding: "10px", background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.colors.border}`, borderRadius: "2px", color: theme.colors.goldDark, fontFamily: theme.fonts.heading, fontSize: "11px", fontWeight: 600, letterSpacing: "1px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.2s",
            }}>
              <Icons.Google size={16} /> Continue with Google
            </button>
          )}
        </div>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          {mode === "login" && (
            <>
              <button onClick={() => switchMode("register")} style={{ background: "none", border: "none", color: theme.colors.bgDark, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Create an account</button>
              <span style={{ color: theme.colors.textMuted, margin: "0 8px" }}>·</span>
              <button onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", color: theme.colors.bgDark, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Forgot password?</button>
            </>
          )}
          {(mode === "register" || mode === "forgot" || mode === "reset") && (
            <button onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: theme.colors.zeus, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Back to login</button>
          )}
        </div>
      </div>
    </div>
  );
}