import { theme } from '../../configs/theme';
import * as Icons from '../components/Icons';
import welcomeScene from '../../assets/images/welcomeScene.png';

type CallbackType = 'verified' | 'email-changed' | 'provider-linked';
type CallbackStatus = 'success' | 'error';

interface EmailCallbackPageProps {
  type: CallbackType;
  status: CallbackStatus;
  message: string;
  onDone: () => void;
}

const TITLES: Record<CallbackType, Record<CallbackStatus, string>> = {
  'verified': {
    success: 'Email Verified',
    error: 'Verification Failed',
  },
  'email-changed': {
    success: 'Email Updated',
    error: 'Email Update Failed',
  },
  'provider-linked': {
    success: 'Account Linked',
    error: 'Link Failed',
  },
};

const MESSAGES: Record<CallbackType, Record<CallbackStatus, string>> = {
  'verified': {
    success: 'Your email has been verified successfully. You can now log in.',
    error: '',
  },
  'email-changed': {
    success: 'Your email address has been updated successfully.',
    error: '',
  },
  'provider-linked': {
    success: 'Your Google account has been linked to your existing profile.',
    error: '',
  },
};

export default function EmailCallbackPage({ type, status, message, onDone }: EmailCallbackPageProps) {
  const isSuccess = status === 'success';
  const title = TITLES[type][status];
  const defaultMsg = MESSAGES[type][status];
  const displayMsg = isSuccess ? defaultMsg : (message || 'Something went wrong. The link may have expired.');

  return (
    <div className="animate-fadeIn" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.bgDark,
      backgroundImage: `radial-gradient(circle at center, rgba(200,170,110,0.4) 0%, transparent 60%), url(${welcomeScene})`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(1px 1px at 20% 30%, ${theme.colors.goldGlow}, transparent)`,
        backgroundSize: '200px 200px',
      }} />

      <div className="animate-scaleIn" style={{
        width: '420px', background: theme.colors.bgPanel,
        border: `1px solid ${theme.colors.gold}`,
        borderRadius: '4px', padding: '48px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        boxShadow: `0 0 60px ${theme.colors.goldGlow}`,
        position: 'relative',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px',
          background: isSuccess ? 'rgba(168,198,108,0.15)' : 'rgba(232,64,87,0.15)',
          border: `2px solid ${isSuccess ? theme.colors.hpHigh : theme.colors.dead}`,
        }}>
          {isSuccess
            ? <Icons.Check size={32} />
            : <Icons.X size={32} />
          }
        </div>

        <h1 style={{
          fontSize: '20px', fontWeight: 700, fontFamily: theme.fonts.heading,
          background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.goldDark})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '16px', letterSpacing: '3px', textAlign: 'center', textTransform: 'uppercase',
        }}>
          {title}
        </h1>

        <p style={{
          fontFamily: theme.fonts.mono, fontSize: '13px',
          color: isSuccess ? theme.colors.hpHigh : theme.colors.dead,
          textAlign: 'center', lineHeight: 1.6, marginBottom: '32px',
        }}>
          {displayMsg}
        </p>

        <button
          className="btn-press"
          onClick={onDone}
          style={{
            width: '100%', padding: '12px',
            background: `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
            border: 'none', borderRadius: '2px',
            color: theme.colors.goldDark, fontFamily: theme.fonts.heading,
            fontSize: '13px', fontWeight: 700, letterSpacing: '2px',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {type === 'provider-linked' ? 'Continue' : 'Go to Login'}
        </button>
      </div>
    </div>
  );
}
