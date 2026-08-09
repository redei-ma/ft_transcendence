import { useState, useEffect } from 'react';
import * as api from '../services/apiService';
import * as Icons from './Icons';
import { theme } from '../../configs/theme';

interface GameInviteToastProps {
  invites: api.GameInvite[];
  onAccept: (invite: api.GameInvite) => void;
  onDecline: (invite: api.GameInvite) => void;
}

export default function GameInviteToast({ invites, onAccept, onDecline }: GameInviteToastProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [now, setNow] = useState(Date.now());

  // Countdown timer — aggiorna ogni secondo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAccept = (invite: api.GameInvite) => onAccept(invite);
  const handleReject = (invite: api.GameInvite) => onDecline(invite);

  const handleDismiss = (inviteId: number) => {
    setDismissed(prev => new Set(prev).add(inviteId));
  };

  // Filtra: solo inviti non dismissed e non scaduti
  const visible = invites.filter(inv => {
    if (dismissed.has(inv.id)) return false;
    const expiresAt = new Date(inv.expiresAt).getTime();
    if (now >= expiresAt) return false;
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 80, // sotto la navbar
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000, // sopra tutto, anche i modali
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {visible.map((inv) => {
        const expiresAt = new Date(inv.expiresAt).getTime();
        const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

        return (
          <div key={inv.id} className="animate-slideUp" style={{
            pointerEvents: 'auto',
            width: '380px',
            background: theme.colors.bgPanel,
            border: `1px solid ${theme.colors.gold}`,
            borderRadius: '8px',
            padding: '16px 20px',
            boxShadow: `0 0 40px ${theme.colors.goldGlow}, 0 8px 32px rgba(0,0,0,0.6)`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: theme.colors.gold }}><Icons.Zap size={18} /></div>
                <span style={{
                  fontFamily: theme.fonts.heading, fontSize: '13px', fontWeight: 700,
                  color: theme.colors.goldBright, letterSpacing: '2px', textTransform: 'uppercase',
                }}>Game Invite</span>
              </div>
              <button onClick={() => handleDismiss(inv.id)} style={{
                background: 'none', border: 'none', color: theme.colors.textMuted,
                cursor: 'pointer', padding: '2px', display: 'flex',
              }}>
                <Icons.X size={14} />
              </button>
            </div>

            {/* Sender info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={inv.sender.avatarUrl}
                alt="" style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${theme.colors.gold}` }}
              />
              <div>
                <div style={{ fontFamily: theme.fonts.heading, fontSize: '15px', fontWeight: 700, color: theme.colors.textPrimary }}>
                  {inv.sender.username}
                </div>
                <div style={{ fontFamily: theme.fonts.mono, fontSize: '11px', color: theme.colors.textSecondary }}>
                  wants to fight you!
                </div>
              </div>
              <div style={{
                marginLeft: 'auto', fontFamily: theme.fonts.mono, fontSize: '20px', fontWeight: 700,
                color: remaining <= 10 ? theme.colors.dead : theme.colors.gold,
                transition: 'color 0.3s',
              }}>
                {remaining}s
              </div>
            </div>

            {/* Progress bar scadenza */}
            <div style={{
              width: '100%', height: '3px', background: theme.colors.bgDark,
              borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(remaining / 60) * 100}%`, // assume 60s default TTL
                background: remaining <= 10
                  ? theme.colors.dead
                  : `linear-gradient(90deg, ${theme.colors.goldDark}, ${theme.colors.gold})`,
                transition: 'width 1s linear, background 0.3s',
              }} />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleAccept(inv)} style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '4px',
                background: `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
                color: theme.colors.bgDark, fontFamily: theme.fonts.heading,
                fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all 0.2s',
              }}>Accept</button>
              <button onClick={() => handleReject(inv)} style={{
                flex: 1, padding: '10px', border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px', background: 'transparent',
                color: theme.colors.textMuted, fontFamily: theme.fonts.heading,
                fontSize: '12px', fontWeight: 600, letterSpacing: '2px',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all 0.2s',
              }}>Decline</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}