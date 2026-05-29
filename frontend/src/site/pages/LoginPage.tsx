import React, { useState, useCallback, useEffect } from 'react';
import { inputStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as authService from '../services/authService';
import { toErrorString } from '../services/authService';
import welcomeScene from '../../assets/images/welcomeScene.png';
import { theme } from '../../configs/theme';
import { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE } from '@transcendence/types';

interface LoginPageProps {
  onLogin: () => void;
}

// Validazione
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Memorizza l'email usata per la registrazione per agevolare il resend
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [formData, setFormData] = useState({
    identifier: "", username: "", email: "", password: "", confirmPassword: "", totp: "", resetToken: ""
  });

  // SE L'UTENTE APRE IL LINK "reset-password?token=..."
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setMode("reset");
      setFormData(prev => ({ ...prev, resetToken: token }));
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // Validazione locale prima dell'invio
  const validate = (): string | null => {
    if (mode === "login") {
      if (!formData.identifier.trim()) return "Enter your username or email.";
      if (!formData.password) return "Enter your password.";
      if (show2fa && formData.totp.length !== 6) return "The 2FA code must be 6 digits.";
    }

    if (mode === "register") {
      if (!formData.username.trim()) return "Enter a username.";
      if (formData.username.trim().length < USERNAME_MIN) return `Username too short (min ${USERNAME_MIN} characters).`;
      if (formData.username.trim().length > USERNAME_MAX) return `Username too long (max ${USERNAME_MAX} characters).`;
      if (!formData.email.trim()) return "Enter an email address.";
      if (!EMAIL_REGEX.test(formData.email.trim())) return "Invalid email format.";
      if (!formData.password) return "Enter a password.";
      if (!PASSWORD_REGEX.test(formData.password)) return PASSWORD_ERROR_MESSAGE;
      if (!formData.confirmPassword) return "Please confirm your password.";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match.";
    }

    if (mode === "forgot") {
      if (!formData.email.trim()) return "Enter your email address.";
      if (!EMAIL_REGEX.test(formData.email.trim())) return "Invalid email format.";
    }

    if (mode === "reset") {
      if (!formData.password) return "Enter your new password.";
      if (!PASSWORD_REGEX.test(formData.password)) return PASSWORD_ERROR_MESSAGE;
      if (formData.password !== formData.confirmPassword) return "Passwords do not match.";
    }

    return null;
  };

  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => { //  'e?: React.FormEvent' per supportare l'invio tramite form
    if (e) e.preventDefault(); // Evita che il browser ricarichi la pagina quando premi Enter

    setError("");
    setSuccessMsg("");

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);

    try {
      if (mode === "login") {
        if (show2fa) {
          const { ok, data } = await authService.login(formData.identifier.trim(), formData.password, formData.totp);
          if (ok) return onLogin();
          setError(toErrorString(data.message || data.error || "Invalid 2FA code"));
        } else {
          const { ok, data } = await authService.login(formData.identifier.trim(), formData.password);

          if (data.requires2fa || data.message === '2FA required') {
            setShow2fa(true);
            setLoading(false);
            return;
          }
          if (ok) return onLogin();

          setError(toErrorString(data.message || data.error || "Login failed"));
        }

      } else if (mode === "register") {
        const { ok, data } = await authService.register(formData.username.trim(), formData.email.trim(), formData.password);
        if (ok) {
          setSuccessMsg("Registration successful! Check your email to verify your account.");
          setRegisteredEmail(formData.email.trim()); // Memorizza l'email pulita in caso di resend
          setMode("login");
          setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
        } else {
          setError(toErrorString(data.message || data.error || "Registration failed"));
        }

      } else if (mode === "forgot") {
        await authService.forgotPassword(formData.email.trim());
        setSuccessMsg("If this email is registered, we sent you a password reset link.");

      } else if (mode === "reset") {
        const result = await authService.resetPassword(formData.resetToken, formData.password);
        if (result.ok) {
          setSuccessMsg("Password reset successfully! You can now log in.");
          setMode("login");
        } else {
          setError(toErrorString(result.message || "Password reset failed. The link may have expired."));
        }
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }, [mode, formData, show2fa, onLogin]);

  // RESEND VERIFICATION
  const handleResend = async () => {
    setError("");
    setSuccessMsg("");
    
    let targetEmail = "";

    const cleanRegEmail = registeredEmail.trim();
    const cleanFormEmail = formData.email.trim();
    const cleanId = formData.identifier.trim();

    if (cleanRegEmail && EMAIL_REGEX.test(cleanRegEmail)) {
      targetEmail = cleanRegEmail;
    } else if (cleanFormEmail && EMAIL_REGEX.test(cleanFormEmail)) {
      targetEmail = cleanFormEmail;
    } else if (cleanId && EMAIL_REGEX.test(cleanId)) {
      targetEmail = cleanId;
    }

    if (!targetEmail) {
      return setError("To resend the verification link, enter your email address in the text field.");
    }

    setLoading(true);
    const result = await authService.resendVerification(targetEmail);
    if (result.ok) {
      setSuccessMsg(`Verification email resent to: ${targetEmail}`);
    } else {
      setError(toErrorString(result.message || "Failed to send email. Please try again."));
    }
    setLoading(false);
  };

  const switchMode = (m: typeof mode) => {
    setMode(m);
    setError("");
    setSuccessMsg("");
    setShow2fa(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData(prev => ({ ...prev, username: "", email: "", password: "", confirmPassword: "" }));
  };

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
          {mode === "reset" && "New Password"}
        </h1>

        {successMsg && (
          <div style={{ width: "100%", padding: "8px 12px", marginBottom: "12px", background: "rgba(30,120,20,0.30)", border: "1px solid #4a9e2a", borderRadius: "2px", color: "#5ab832", fontFamily: theme.fonts.mono, fontSize: "12px", textAlign: "center" }}>
            {successMsg}
            {(successMsg.includes("Registration successful") || successMsg.includes("resent to")) && (
              <button type="button" onClick={handleResend} style={{ display: 'block', margin: '8px auto 0', padding: '4px 8px', background: 'none', border: "1px solid #4a9e2a", color: "#5ab832", cursor: 'pointer', fontSize: '11px', borderRadius: '2px' }}>
                Resend email
              </button>
            )}
          </div>
        )}

        {error && (
          <div style={{ width: "100%", padding: "8px 12px", marginBottom: "12px", background: "rgba(232,64,87,0.25)", border: `1px solid ${theme.colors.dead}`, borderRadius: "2px", color: theme.colors.dead, fontFamily: theme.fonts.mono, fontSize: "12px", textAlign: "center" }}>
            {error}
            {error.toLowerCase().includes("verify your email") && (
              <button type="button" onClick={handleResend} style={{ display: 'block', margin: '8px auto 0', padding: '4px 8px', background: 'none', border: `1px solid ${theme.colors.dead}`, color: theme.colors.textPrimary, cursor: 'pointer', fontSize: '11px' }}>
                Resend email
              </button>
            )}
          </div>
        )}

        {/* ⚡ Da un normale DIV a un FORM con onSubmit collegato */}
        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* LOGIN: campo identifier (username o email) */}
          {mode === "login" && (
            <input className="input-glow" type="text" placeholder="Username or Email"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              style={inputStyle} />
          )}

          {/* REGISTER: campi separati username + email */}
          {mode === "register" && (
            <>
              <input className="input-glow" type="text" placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={inputStyle} />
              <input className="input-glow" type="email" placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle} />
            </>
          )}

          {/* FORGOT: solo email */}
          {mode === "forgot" && (
            <input className="input-glow" type="email" placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle} />
          )}

          {/* Password (login, register, reset) */}
          {(mode === "login" || mode === "register" || mode === "reset") && (
            <div style={{ position: "relative" }}>
              <input className="input-glow" type={showPassword ? "text" : "password"} placeholder="Password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ ...inputStyle, paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: theme.colors.textMuted, cursor: "pointer", padding: "4px", display: "flex" }}>
                {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
              </button>
            </div>
          )}

          {/* Confirm password (register + reset) */}
          {(mode === "register" || mode === "reset") && (
            <div style={{ position: "relative" }}>
              <input className="input-glow" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={{ ...inputStyle, paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: theme.colors.textMuted, cursor: "pointer", padding: "4px", display: "flex" }}>
                {showConfirmPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
              </button>
            </div>
          )}

          {/* 2FA */}
          {show2fa && mode === "login" && (
            <div className="animate-slideUp">
              <input className="input-glow" type="text" placeholder="— — — — — —"
                value={formData.totp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, totp: val });
                }}
                style={{ ...inputStyle, textAlign: "center", letterSpacing: "8px", fontSize: "20px" }}
                maxLength={6} />
            </div>
          )}

          {/* Submit -> type="submit" in modo che reagisca al tasto ENTER! */}
          <button className="btn-press" type="submit" disabled={loading} style={{
            width: "100%", padding: "12px",
            background: loading ? theme.colors.textMuted : `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
            border: "none", borderRadius: "2px", color: theme.colors.goldDark, fontFamily: theme.fonts.heading, fontSize: "13px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", cursor: loading ? "wait" : "pointer", transition: "all 0.2s", marginTop: "4px",
          }}>
            {loading ? "..." : mode === "login" ? "Enter" : mode === "register" ? "Register" : mode === "forgot" ? "Send Link" : "Reset Pwd"}
          </button>

          {/* Google OAuth -> type="button" fondamentale qui, per non inviare il form normale! */}
          {mode !== "forgot" && mode !== "reset" && (
            <button type="button" className="btn-press" onClick={authService.redirectToGoogle} style={{
              width: "100%", padding: "10px", background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.colors.border}`, borderRadius: "2px", color: theme.colors.goldDark, fontFamily: theme.fonts.heading, fontSize: "11px", fontWeight: 600, letterSpacing: "1px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.2s",
            }}>
              <Icons.Google size={16} /> Continue with Google
            </button>
          )}
        </form>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          {mode === "login" && (
            <>
              <button type="button" onClick={() => switchMode("register")} style={{ background: "none", border: "none", color: theme.colors.bgDark, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Create an account</button>
              <span style={{ color: theme.colors.textMuted, margin: "0 8px" }}>·</span>
              <button type="button" onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", color: theme.colors.bgDark, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Forgot password?</button>
            </>
          )}
          {(mode === "register" || mode === "forgot" || mode === "reset") && (
            <button type="button" onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: theme.colors.zeus, cursor: "pointer", fontFamily: theme.fonts.mono, fontSize: "13px" }}>Back to login</button>
          )}
        </div>
      </div>
    </div>
  );
}