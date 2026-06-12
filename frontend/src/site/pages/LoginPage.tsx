import React, { useState, useCallback, useEffect } from 'react';
import { inputStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as authService from '../services/authService';
import { toErrorString } from '../services/authService';
import welcomeScene from '../../assets/images/welcomeScene.png';
import { theme } from '../../configs/theme';
import { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE, EMAIL_REGEX, RATE_LIMIT_ERROR_MESSAGE, USERNAME_REGEX, USERNAME_MIN, USERNAME_MAX, USERNAME_ERROR_MESSAGE } from '@transcendence/types';
import { useResponsive } from '../../hooks/useResponsive';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { isMobile, isTablet } = useResponsive();
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalDoc, setLegalDoc] = useState<null | "terms" | "privacy">(null);

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
      if (!USERNAME_REGEX.test(formData.username.trim())) return USERNAME_ERROR_MESSAGE;
      if (!formData.email.trim()) return "Enter an email address.";
      if (!EMAIL_REGEX.test(formData.email.trim())) return "Invalid email format.";
      if (!formData.password) return "Enter a password.";
      if (!PASSWORD_REGEX.test(formData.password)) return PASSWORD_ERROR_MESSAGE;
      if (!formData.confirmPassword) return "Please confirm your password.";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match.";
      if (!termsAccepted) return "You must accept the Terms of Service and Privacy Policy to register.";
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
    if (validationError) { showTimed(setError, validationError); return; }

    setLoading(true);

    try {
      if (mode === "login") {
        if (show2fa) {
          const { ok, data } = await authService.login(formData.identifier.trim(), formData.password, formData.totp);
          if (ok) return onLogin();
          if (data.error === 'rate_limited') showTimed(setError, RATE_LIMIT_ERROR_MESSAGE);
          else showTimed(setError, toErrorString(data.message || data.error || "Invalid 2FA code"));
        } else {
          const { ok, data } = await authService.login(formData.identifier.trim(), formData.password);

          if (data.requires2fa || data.message === '2FA required') {
            setShow2fa(true);
            setLoading(false);
            return;
          }
          if (ok) return onLogin();
          if (data.error === 'rate_limited') showTimed(setError, RATE_LIMIT_ERROR_MESSAGE);
          else showTimed(setError, toErrorString(data.message || data.error || "Login failed"));
        }

      } else if (mode === "register") {
        const { ok, data } = await authService.register(formData.username.trim(), formData.email.trim(), formData.password, termsAccepted);
        if (ok) {
          setSuccessMsg("Registration successful! Check your email to verify your account.");
          setRegisteredEmail(formData.email.trim()); // Memorizza l'email pulita in caso di resend
          setMode("login");
          setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
        } else if (data.error === 'rate_limited') {
          showTimed(setError, RATE_LIMIT_ERROR_MESSAGE);
        } else {
          showTimed(setError, toErrorString(data.message || data.error || "Registration failed"));
        }

      } else if (mode === "forgot") {
        const forgotResult = await authService.forgotPassword(formData.email.trim());
        if (forgotResult === 'rate_limited') showTimed(setError, RATE_LIMIT_ERROR_MESSAGE);
        else showTimed(setSuccessMsg, "If this email is registered, we sent you a password reset link.");

      } else if (mode === "reset") {
        const result = await authService.resetPassword(formData.resetToken, formData.password);
        if (result.ok) {
          showTimed(setSuccessMsg, "Password reset successfully! You can now log in.");
          setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
          setMode("login");
        } else {
          showTimed(setError, toErrorString(result.message || "Password reset failed. The link may have expired."));
        }
      }
    } catch {
      showTimed(setError, "Network error. Please try again.");
    }
    setLoading(false);
  }, [mode, formData, show2fa, termsAccepted, onLogin]);

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
      return showTimed(setError, "To resend the verification link, enter your email address in the text field.");
    }

    setLoading(true);
    const result = await authService.resendVerification(targetEmail);
    if (result.ok) {
      setSuccessMsg(`Verification email resent to: ${targetEmail}`);
    } else {
      showTimed(setError, toErrorString(result.message || "Failed to send email. Please try again."));
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
    setTermsAccepted(false);
  };

  const showTimed = (setter: (v: string) => void, text: string) => {
    setter(text);
    setTimeout(() => setter(''), 5000);
  };

  // Il submit è bloccato finché, in registrazione, non si spuntano i termini
  const submitDisabled = loading || (mode === "register" && !termsAccepted);

  return (
    <div className="animate-fadeIn" style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: theme.colors.bgDark,
      backgroundImage: `radial-gradient(circle at center, rgba(200,170,110,0.4) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(10,200,185,0.04) 0%, transparent 90%), url(${welcomeScene})`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      position: "relative", paddingTop: "60px", paddingBottom: "100px",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(1px 1px at 20% 30%, ${theme.colors.goldGlow}, transparent), radial-gradient(1px 1px at 80% 70%, ${theme.colors.goldSubtle}, transparent)`,
        backgroundSize: "200px 200px, 300px 300px",
      }} />

      <div style={{
        width: isTablet ? "min(440px, calc(100% - 32px))" : "440px",
        borderRadius: isTablet ? "16px" : "50%",
        background: `radial-gradient(circle at center, ${theme.colors.bgPanel}00 20%, ${theme.colors.bgDark}00 70%)`,
        transform: isTablet ? 'none' : 'translateY(70px)',
        border: `1px solid ${theme.colors.border}`,
        animation: "orbPulse 4s ease-in-out infinite", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "32px 20px" : "60px 50px",
        position: "relative",
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
          <div style={{ width: "100%", padding: "8px 12px", marginBottom: "12px", background: "rgba(168,198,108,0.15)", border: `1px solid ${theme.colors.hpHigh}`, borderRadius: "2px", color: theme.colors.bgDark, fontFamily: theme.fonts.mono, fontSize: "12px", textAlign: "center" }}>
            {successMsg}
            {(successMsg.includes("Registration successful") || successMsg.includes("resent to")) && (
              <button type="button" onClick={handleResend} style={{ display: 'block', margin: '8px auto 0', padding: '6px 14px', background: theme.colors.hpHigh, border: 'none', color: theme.colors.bgDark, cursor: 'pointer', fontSize: '11px', fontWeight: 700, borderRadius: '2px', letterSpacing: '0.5px' }}>
                Resend email
              </button>
            )}
          </div>
        )}

        {error && (
          <div style={{ width: "100%", padding: "8px 12px", marginBottom: "12px", background: "rgba(232,64,87,0.25)", border: `1px solid ${theme.colors.dead}`, borderRadius: "2px", color: theme.colors.bgDark, fontFamily: theme.fonts.mono, fontSize: "12px", textAlign: "center" }}>
            {error}
            {error.toLowerCase().includes("verify your email") && (
              <button type="button" onClick={handleResend} style={{ display: 'block', margin: '8px auto 0', padding: '4px 8px', background: 'none', border: `1px solid ${theme.colors.dead}`, color: theme.colors.bgDark, cursor: 'pointer', fontSize: '11px' }}>
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

          {/* REGISTER: username + email + accettazione termini (un solo blocco) */}
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
              autoComplete="off"
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

          {/* Terms & Conditions checkbox (register only) */}
          {mode === "register" && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              fontFamily: theme.fonts.mono, fontSize: "12px",
              color: theme.colors.goldDark, lineHeight: 1.4,
            }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: "2px", cursor: "pointer", accentColor: theme.colors.gold }}
              />
              <span>
                I have read and accept the{" "}
                <button type="button" onClick={() => setLegalDoc("terms")}
                  style={{ background: "none", border: "none", padding: 0, color: theme.colors.zeus, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
                  Terms of Service
                </button>
                {" "}and the{" "}
                <button type="button" onClick={() => setLegalDoc("privacy")}
                  style={{ background: "none", border: "none", padding: 0, color: theme.colors.zeus, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
                  Privacy Policy
                </button>
                {" "}(required)
              </span>
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
          <button className="btn-press" type="submit" disabled={submitDisabled} style={{
            width: "100%", padding: "12px",
            background: submitDisabled ? theme.colors.textMuted : `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
            border: "none", borderRadius: "2px", color: theme.colors.goldDark, fontFamily: theme.fonts.heading, fontSize: "13px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", cursor: loading ? "wait" : submitDisabled ? "not-allowed" : "pointer", transition: "all 0.2s", marginTop: "4px",
          }}>
            {loading ? "..." : mode === "login" ? "Enter" : mode === "register" ? "Register" : mode === "forgot" ? "Send Link" : "Reset Pwd"}
          </button>

          {/* Google OAuth -> type="button" fondamentale qui, per non inviare il form normale! */}
          {mode !== "forgot" && mode !== "reset" && (
            <button type="button" className="btn-press" onClick={authService.redirectToGoogle} style={{
              width: "100%", padding: "10px", background: `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`, border: "none", borderRadius: "2px", color: theme.colors.goldDark, fontFamily: theme.fonts.heading, fontSize: "11px", fontWeight: 700, letterSpacing: "1px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.2s",
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

      {/* Footer */}
      <footer style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "20px 48px", borderTop: `1px solid ${theme.colors.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(0,0,0,0.55)",
      }}>
        <div style={{ display: "flex", gap: "24px" }}>
          <span onClick={() => setLegalDoc("privacy")} style={{
            fontFamily: theme.fonts.heading, color: theme.colors.textSecondary, fontSize: "11px",
            letterSpacing: "1px", cursor: "pointer", transition: "color 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.gold}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
          >PRIVACY POLICY</span>
          <span onClick={() => setLegalDoc("terms")} style={{
            fontFamily: theme.fonts.heading, color: theme.colors.textSecondary, fontSize: "11px",
            letterSpacing: "1px", cursor: "pointer", transition: "color 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.gold}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
          >TERMS OF SERVICE</span>
        </div>
        <span style={{ fontFamily: theme.fonts.heading, color: theme.colors.textSecondary, fontSize: "11px", letterSpacing: "1px" }}>
          CLASH OF OLYMPUS © 2026
        </span>
      </footer>

      {/* Legal Modal */}
      {legalDoc && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setLegalDoc(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: theme.colors.bgPanel, border: `1px solid ${theme.colors.gold}`,
            borderRadius: "4px", padding: "40px", maxWidth: "600px", width: "90%",
            maxHeight: "80vh", overflowY: "auto",
            boxShadow: `0 0 40px ${theme.colors.goldGlow}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontFamily: theme.fonts.heading, color: theme.colors.goldBright, fontSize: "20px", letterSpacing: "2px" }}>
                {legalDoc === "terms" ? "Terms of Service" : "Privacy Policy"}
              </h2>
              <button type="button" onClick={() => setLegalDoc(null)} style={{
                background: "none", border: "none", color: theme.colors.textMuted, cursor: "pointer",
              }}><Icons.X size={20} /></button>
            </div>
            <div style={{ fontFamily: theme.fonts.mono, fontSize: "12px", color: theme.colors.textSecondary, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {legalDoc === "terms" ? TERMS_TEXT : PRIVACY_TEXT}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const EMAIL_USER = import.meta.env.VITE_EMAIL_USER || 'email not currently available';

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
