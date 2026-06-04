import { useState, useEffect, useRef } from 'react';
import { inputStyle, sectionTitleStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as api from '../services/apiService';
import * as authService from '../services/authService';
import { UserProfile, UserStats, UserSettings, UserAchievementsResponse, MatchHistoryResponse, generate2fa, turnOn2fa, turnOff2fa } from '../services/apiService';
import { theme } from '../../configs/theme';
import { NAVBAR_HEIGHT } from '../components/Navbar';
import { CharacterName, PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE, EMAIL_REGEX, USERNAME_REGEX, USERNAME_MIN, USERNAME_MAX, USERNAME_ERROR_MESSAGE } from '@transcendence/types';
import AdeHistory from '../../assets/images/AdeHistory.png';
import ZeusHistory from '../../assets/images/ZeusHistory.png';

const statusColor = (s: string) => 
  s === 'ONLINE' ? theme.colors.hpHigh : 
  s === 'IN_GAME' ? theme.colors.zeus : 
  theme.colors.textMuted;

function StatBox({ label, value, color = theme.colors.gold }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ padding: '20px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px', textAlign: 'center' }}>
      <div style={{ fontFamily: theme.fonts.heading, fontSize: '24px', fontWeight: 800, color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontFamily: theme.fonts.heading, fontSize: '10px', color: theme.colors.textMuted, letterSpacing: '1.5px' }}>
        {label}
      </div>
    </div>
  );
}

function EditableField({ label, value, isEditing, onEdit, onSave, onCancel, tempVal, setTempVal }: {
  label: string; value: string; isEditing: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
  tempVal: string; setTempVal: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px', marginBottom: '8px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: theme.fonts.heading, fontSize: '10px', color: theme.colors.textMuted, letterSpacing: '1.5px', marginBottom: '4px' }}>
          {label}
        </div>
        {isEditing ? (
          <input 
            className="input-glow" 
            value={tempVal} 
            onChange={(e) => setTempVal(e.target.value)} 
            style={{ ...inputStyle, padding: '6px 10px', fontSize: '14px', width: '100%' }} 
            autoFocus 
          />
        ) : (
          <div style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.mono, fontSize: '15px' }}>
            {value}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
        {isEditing ? (
          <>
            <button onClick={onSave} style={{ background: 'none', border: 'none', color: theme.colors.zeus, cursor: 'pointer', padding: '4px', display: 'flex' }}><Icons.Check size={18} /></button>
            <button onClick={onCancel} style={{ background: 'none', border: 'none', color: theme.colors.dead, cursor: 'pointer', padding: '4px', display: 'flex' }}><Icons.X size={18} /></button>
          </>
        ) : (
          <button onClick={() => { setTempVal(value); onEdit(); }} style={{ background: 'none', border: 'none', color: theme.colors.textMuted, cursor: 'pointer', padding: '4px', display: 'flex' }}><Icons.Edit size={16} /></button>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isSettingUp2fa, setIsSettingUp2fa] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [error2fa, setError2fa] = useState('');

  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdData, setPwdData] = useState({ old: '', new: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [msg, setMsg] = useState('');

  const confirmPwdRef = useRef(''); // Per la password
  const [confirmPwdDisplay, setConfirmPwdDisplay] = useState('');

  const [achievements, setAchievements] = useState<UserAchievementsResponse | null>(null);

  const [matches, setMatches] = useState<MatchHistoryResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);// per file nascosto di uploadAvatar

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    msg: string;
    action: () => void;
    needsPassword?: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([api.getMyProfile(), api.getMyStats(), api.getMySettings(), api.getMyAchievements(), api.getMyMatches()])
      .then(([p, s, set, ach, mat]) => { 
        if (p) setProfile(p); 
        if (s) setStats(s); 
        if (set) setSettings(set);
        if (ach) setAchievements(ach);
        if (mat) setMatches(mat);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveUsername = () => {
    const val = tempUsername.trim();
    if (!val) return setUsernameError("Enter a username.");
    if (val.length < USERNAME_MIN) return setUsernameError(`Username too short (min ${USERNAME_MIN} characters).`);
    if (val.length > USERNAME_MAX) return setUsernameError(`Username too long (max ${USERNAME_MAX} characters).`);
    if (!USERNAME_REGEX.test(val)) return setUsernameError(USERNAME_ERROR_MESSAGE);
    setUsernameError('');
    setDialog({
      isOpen: true,
      title: "Confirm Username Change",
      msg: `Are you sure you want to change your username to "${tempUsername}"?`,
      action: async () => {
        setDialog(null);
        const result = await api.updateUsername(tempUsername);
        if (result.ok) {
          setProfile((p) => p ? { ...p, username: tempUsername } : null);
        } else {
          setUsernameError(result.message || "Failed to update username.");
        }
        setEditingUsername(false);
      }
    });
  };
  
  const handleSaveEmail = () => {
    const val = tempEmail.trim();
    if (!val) return setEmailError("Enter an email address.");
    if (!EMAIL_REGEX.test(val)) return setEmailError("Invalid email format.");
    setEmailError('');
    confirmPwdRef.current = '';
    setConfirmPwdDisplay('');
    setDialog({
      isOpen: true,
      title: "Confirm Email Change",
      msg: `To change your email to "${tempEmail}", enter your current password.`,
      needsPassword: true,
      action: async () => {
        if (!confirmPwdRef.current) {
          setDialog(prev => prev ? { ...prev, error: "Please enter your password to confirm." } : null);
          return;
        }
        setDialog(null);
        const result = await api.requestEmailChange(confirmPwdRef.current, tempEmail);
        if (result.ok) {
          setEmailError('');
          setMsg("Confirmation link sent to the new email!");
          setEditingEmail(false);
          confirmPwdRef.current = '';
          setConfirmPwdDisplay('');
        } else {
          setEmailError(result.message || "Request failed");
        }
      }
    });
  };

  const handleSavePassword = () => {
    setPwdError('');
    if (!pwdData.old) return setPwdError("Enter your current password.");
    if (pwdData.new !== pwdData.confirm) return setPwdError("Passwords do not match.");
    if (!PASSWORD_REGEX.test(pwdData.new)) return setPwdError(PASSWORD_ERROR_MESSAGE);

    setDialog({
      isOpen: true,
      title: "Confirm Password Change",
      msg: "Are you sure you want to change your password? You will be logged out shortly.",
      action: async () => {
        setDialog(null);
        const result = await api.changePassword(pwdData.old, pwdData.new);
        if (result.ok) {
          setMsg("Password updated successfully! Logging out...");
          setIsChangingPwd(false);
          setPwdData({ old: '', new: '', confirm: '' });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setPwdError(result.message || "Failed to change password.");
        }
      }
    });
  };

  const handleEnable2faClick = async () => {
    setError2fa('');
    const data = await generate2fa();
    if (data && data.qrCode) { 
      setQrCodeUrl(data.qrCode);
      setIsSettingUp2fa(true);
    } else {
      setError2fa("Error generating QR Code.");
    }
  };

  const handleConfirm2fa = async () => {
    setError2fa('');
    if (setupCode.length !== 6 || !/^\d{6}$/.test(setupCode)) return setError2fa("The 2FA code must be exactly 6 digits.");
    const result = await turnOn2fa(setupCode);
    if (result.ok) {
      setIsSettingUp2fa(false);
      setQrCodeUrl(null);
      setSetupCode('');
      setSettings(prev => prev ? { ...prev, is2faEnabled: true } : null);
    } else {
      setError2fa(result.message || "Incorrect code. Please try again.");
    }
  };

  const handleDisable2faClick = async () => {
    const success = await turnOff2fa();
    if (success) {
      setSettings(prev => prev ? { ...prev, is2faEnabled: false } : null);
    }
  };

  if (loading) return (
    <div style={{ paddingTop: `calc(${NAVBAR_HEIGHT}px + 80px)`, textAlign: 'center' }}>
      <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, letterSpacing: '2px' }}>Loading...</p>
    </div>
  );

  const username = profile?.username || 'Unknown';
  const email = profile?.email || '';
  const avatarUrl = profile?.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${username}`;
  const userStatus = profile?.status || 'OFFLINE';
  const createdAt = profile?.createdAt || new Date().toISOString();
  
  const s: UserStats = stats || { eloCurrent: 0, eloPeak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, currentWinStreak: 0, bestWinStreak: 0, totalKills: 0, totalDeaths: 1, characterStats: [] };
  const total = s.totalWins + s.totalLosses + s.totalDraws;
  const winRate = total > 0 ? Math.round((s.totalWins / total) * 100) : 0;
  
  const sec: UserSettings = settings || { is2faEnabled: false, isEmailVerified: false, linkedProviders: [] };

  return (
    <div className="animate-fadeIn" style={{ paddingTop: `${NAVBAR_HEIGHT}px`, maxWidth: '800px', margin: '0 auto', paddingBottom: '60px', paddingLeft: '24px', paddingRight: '24px' }}>
      
    {/* Settings & Personalization */}
      <div id="profile-settings" style={{ paddingTop: '40px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
            <img
              src={avatarUrl} alt="avatar"
              style={{ width: '120px', height: '120px', borderRadius: '50%', border: `3px solid ${theme.colors.gold}`, boxShadow: `0 0 30px ${theme.colors.goldGlow}`, cursor: 'pointer' }}
              onClick={() => {
                setDialog({
                  isOpen: true,
                  title: "Edit Avatar",
                  msg: "Do you want to upload a new avatar? Accepted formats: JPEG, PNG, WebP (max 5MB).",
                  action: () => {
                    setDialog(null);
                    fileInputRef.current?.click();
                  }
                });
              }}
            />
            <div style={{
              position: 'absolute', bottom: '4px', right: '4px', width: '20px', height: '20px',
              borderRadius: '50%', background: statusColor(userStatus), border: `3px solid ${theme.colors.bgDark}`,
            }} />
            <div
              onClick={() => {
                setDialog({
                  isOpen: true,
                  title: "Edit Avatar",
                  msg: "Do you want to upload a new avatar? Accepted formats: JPEG, PNG, WebP (max 5MB).",
                  action: () => {
                    setDialog(null);
                    fileInputRef.current?.click();
                  }
                });
              }}
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              <Icons.Edit size={24} />
            </div>
            <input
              ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; }
                const result = await api.uploadAvatar(file);
                if (result.ok && result.profile) {
                  setProfile(prev => prev ? { ...prev, avatarUrl: result.profile!.avatarUrl } : null);
                  setMsg("Avatar updated successfully!");
                  setTimeout(() => setMsg(''), 3000);
                } else {
                  alert(result.message || "Upload failed.");
                }
                e.target.value = '';
              }}
            />
          </div>
          <h1 style={{ fontFamily: theme.fonts.heading, fontSize: '28px', fontWeight: 700, color: theme.colors.goldBright, letterSpacing: '2px' }}>{username}</h1>
          <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: '12px', letterSpacing: '1px', marginTop: '4px' }}>
            Member since {new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
          <button onClick={() => {
            setDialog({
              isOpen: true,
              title: "Reset Avatar",
              msg: "Do you want to reset your avatar to default?",
              action: async () => {
                setDialog(null);
                const result = await api.resetAvatar();
                if (result) {
                  setProfile(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);
                  setMsg("Avatar reset to default!");
                  setTimeout(() => setMsg(''), 3000);
                }
              }
            });
          }} style={{
            background: 'none', border: 'none', color: theme.colors.textMuted,
            fontFamily: theme.fonts.mono, fontSize: '11px', cursor: 'pointer',
            textDecoration: 'underline', marginTop: '8px',
          }}>Reset avatar to default</button>
        </div>
        
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Settings & Personalization</h2>
        
        {msg && <div style={{ color: theme.colors.hpHigh, marginBottom: '16px', textAlign: 'center', fontFamily: theme.fonts.mono }}>{msg}</div>}

        <EditableField label="USERNAME" value={username} isEditing={editingUsername} tempVal={tempUsername} setTempVal={setTempUsername} onEdit={() => { setUsernameError(''); setEditingUsername(true); }} onSave={handleSaveUsername} onCancel={() => { setUsernameError(''); setEditingUsername(false); }} />
        {usernameError && <span style={{ color: theme.colors.dead, fontSize: '12px', fontFamily: theme.fonts.mono, display: 'block', marginTop: '-4px', marginBottom: '4px' }}>{usernameError}</span>}
        <EditableField label="EMAIL" value={email} isEditing={editingEmail} tempVal={tempEmail} setTempVal={setTempEmail} onEdit={() => { setEmailError(''); setEditingEmail(true); }} onSave={handleSaveEmail} onCancel={() => { setEmailError(''); setEditingEmail(false); }} />
        {emailError && <span style={{ color: theme.colors.dead, fontSize: '12px', fontFamily: theme.fonts.mono, display: 'block', marginTop: '-4px', marginBottom: '4px' }}>{emailError}</span>}
        
        {/* Blocco Cambio Password */}
        <div style={{ padding: '16px 20px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: theme.fonts.heading, fontSize: '10px', color: theme.colors.textMuted, letterSpacing: '1.5px' }}>PASSWORD</div>
            {!isChangingPwd && <button onClick={() => setIsChangingPwd(true)} style={{ background: 'none', border: 'none', color: theme.colors.textMuted, cursor: 'pointer' }}><Icons.Edit size={16} /></button>}
          </div>

          {isChangingPwd && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }} className="animate-slideUp">
              <input type="password" placeholder="Current Password" autoComplete="current-password" value={pwdData.old} onChange={e => setPwdData({...pwdData, old: e.target.value})} style={inputStyle} />
              <input type="password" placeholder="New Password" autoComplete="new-password" value={pwdData.new} onChange={e => setPwdData({...pwdData, new: e.target.value})} style={inputStyle} />
              <input type="password" placeholder="Confirm New Password" autoComplete="new-password" value={pwdData.confirm} onChange={e => setPwdData({...pwdData, confirm: e.target.value})} style={inputStyle} />
              
              {pwdError && <span style={{ color: theme.colors.dead, fontSize: '12px', fontFamily: theme.fonts.mono }}>{pwdError}</span>}
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => { setIsChangingPwd(false); setPwdError(''); setPwdData({ old: '', new: '', confirm: '' }); }} style={{ padding: '6px 12px', background: 'none', border: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSavePassword} style={{ padding: '6px 12px', background: theme.colors.zeus, border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}>Save</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Statistics */}
      <div id="profile-stats" style={{ paddingTop: '80px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <StatBox label="ELO" value={s.eloCurrent} />
          <StatBox label="PEAK ELO" value={s.eloPeak} color={theme.colors.goldBright} />
          <StatBox label="WIN RATE" value={`${winRate}%`} color={theme.colors.zeus} />
          <StatBox label="K/D RATIO" value={s.totalDeaths > 0 ? (s.totalKills / s.totalDeaths).toFixed(2) : '0'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <StatBox label="WINS" value={s.totalWins} color={theme.colors.hpHigh} />
          <StatBox label="LOSSES" value={s.totalLosses} color={theme.colors.dead} />
          <StatBox label="BEST STREAK" value={s.bestWinStreak} color={theme.colors.zeus} />
          <StatBox label="CURRENT STREAK" value={s.currentWinStreak} color={theme.colors.zeus} />
        </div>

        {s.characterStats && s.characterStats.length > 0 && (
          <>
            <h3 style={{ fontFamily: theme.fonts.heading, fontSize: '14px', color: theme.colors.textSecondary, letterSpacing: '2px', marginBottom: '16px', textTransform: 'uppercase' }}>By Champion</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {s.characterStats.map((cs) => (
                <div key={cs.characterName} style={{ padding: '20px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{cs.characterName === CharacterName.ZEUS ? '⚡' : '🔥'}</span>
                    <span style={{ fontFamily: theme.fonts.heading, fontWeight: 700, color: theme.colors.goldBright, letterSpacing: '1px', textTransform: 'uppercase' }}>{cs.characterName}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontFamily: theme.fonts.mono, fontSize: '18px', fontWeight: 700, color: theme.colors.hpHigh }}>{cs.wins}</div>
                      <div style={{ fontFamily: theme.fonts.heading, fontSize: '9px', color: theme.colors.textMuted }}>WINS</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: theme.fonts.mono, fontSize: '18px', fontWeight: 700, color: theme.colors.dead }}>{cs.losses}</div>
                      <div style={{ fontFamily: theme.fonts.heading, fontSize: '9px', color: theme.colors.textMuted }}>LOSSES</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: theme.fonts.mono, fontSize: '18px', fontWeight: 700, color: theme.colors.textPrimary }}>
                        {cs.deaths > 0 ? (cs.kills / cs.deaths).toFixed(1) : '0'}
                      </div>
                      <div style={{ fontFamily: theme.fonts.heading, fontSize: '9px', color: theme.colors.textMuted }}>K/D</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

{/* Match History */}
     <div id="profile-matches" style={{ paddingTop: '80px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
  <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>
    Match History
  </h2>

  {(!matches?.entries || matches.entries.length === 0) ? (
    <div style={{ textAlign: 'center', padding: '32px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px' }}>
      <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: '13px', letterSpacing: '1px' }}>
        No matches played yet. Start fighting!
      </p>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {matches.entries.map((m) => {
        const resultColor =
          m.result === 'WIN' ? theme.colors.hpHigh :
          m.result === 'LOSS' ? theme.colors.dead :
          theme.colors.hpMid;

        const mins = Math.floor(m.durationSeconds / 60);
        const secs = m.durationSeconds % 60;

        const me = m.participants.find(p => p.userId === profile?.id);
        const opponent = m.participants.find(p => p.userId !== profile?.id);

        const myIcon = me?.characterName === 'ZEUS' ? ZeusHistory : AdeHistory;
        const oppIcon = opponent?.characterName === 'ZEUS' ? ZeusHistory : AdeHistory;

        return (
          <div key={m.matchId} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            background: theme.colors.bgPanel,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            borderLeft: `3px solid ${resultColor}`,
          }}>
            {/* Result */}
            <div style={{
              fontFamily: theme.fonts.heading,
              fontSize: '13px',
              fontWeight: 700,
              color: resultColor,
              letterSpacing: '1px',
              width: '40px',
              textAlign: 'center',
            }}>
              {m.result}
            </div>
            <img src={myIcon} alt="" style={{ width: 28, height: 28, borderRadius: '4px' }} />
            <span style={{ fontFamily: theme.fonts.heading, fontSize: '13px', fontWeight: 600, color: theme.colors.textPrimary }}>
              {me?.username || profile?.username || '?'}
            </span>
            <span style={{ fontFamily: theme.fonts.mono, fontSize: '10px', color: theme.colors.textMuted }}>
              vs
            </span>
            <span style={{ fontFamily: theme.fonts.heading, fontSize: '13px' }}>
              {opponent?.username || 'Deleted User'}
            </span>
            <img src={oppIcon} alt="" style={{ width: 28, height: 28, borderRadius: '4px' }} />
            <div style={{ flex: 1 }} />
           <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: '10px', color: theme.colors.textSecondary }}>{m.mode}</span>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: '10px' }}>
                {mins}:{secs.toString().padStart(2, '0')}
              </span>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: '10px' }}>
                {new Date(m.playedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: theme.fonts.mono, fontSize: '14px', fontWeight: 700, color: theme.colors.textSecondary }}>
                {me?.kills || 0}/{me?.deaths || 0}
              </div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '9px' }}>K/D</div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div> 


      {/* Achievements */}
      <div id="profile-achievements" style={{ paddingTop: '80px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Achievements</h2>
        
        {/* Progress bar */}
        <div style={{ marginBottom: '24px', padding: '16px 20px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontFamily: theme.fonts.heading, fontSize: '12px', color: theme.colors.textSecondary, letterSpacing: '1px' }}>PROGRESS</span>
            <span style={{ fontFamily: theme.fonts.mono, fontSize: '14px', color: theme.colors.gold, fontWeight: 700 }}>
              {achievements?.unlockedCount || 0} / {achievements?.totalCount || 0}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: theme.colors.bgDark, borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              width: achievements && achievements.totalCount > 0 ? `${(achievements.unlockedCount / achievements.totalCount) * 100}%` : '0%',
              background: `linear-gradient(90deg, ${theme.colors.goldDark}, ${theme.colors.gold})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Achievement cards */}
        {(!achievements?.unlocked || achievements.unlocked.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '32px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px' }}>
            <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: '13px', letterSpacing: '1px' }}>
              No achievements unlocked yet. Keep playing!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {achievements.unlocked.map((ach, i) => {
              const tierColor = ach.tier === 'PLATINUM' ? '#a8e6cf'
                : ach.tier === 'GOLD' ? theme.colors.gold
                : ach.tier === 'SILVER' ? '#c0c0c0'
                : '#cd7f32';
              return (
                <div key={i} style={{
                  padding: '16px', background: theme.colors.bgPanel,
                  border: `1px solid ${tierColor}33`, borderRadius: '4px',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  transition: 'border-color 0.2s',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = tierColor}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = `${tierColor}33`}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '8px', flexShrink: 0,
                    background: `${tierColor}15`, border: `1px solid ${tierColor}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>
                    {ach.tier === 'PLATINUM' ? '💎' : ach.tier === 'GOLD' ? '🏆' : ach.tier === 'SILVER' ? '🥈' : '🥉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: theme.fonts.heading, fontSize: '13px', fontWeight: 700, color: tierColor, letterSpacing: '0.5px', marginBottom: '2px' }}>
                      {ach.name}
                    </div>
                    <div style={{ fontFamily: theme.fonts.mono, fontSize: '11px', color: theme.colors.textSecondary, lineHeight: 1.4, marginBottom: '4px' }}>
                      {ach.description}
                    </div>
                    <div style={{ fontFamily: theme.fonts.mono, fontSize: '9px', color: theme.colors.textMuted }}>
                      {new Date(ach.unlockedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    {/* Friends
      <div id="profile-friends" style={{ paddingTop: '80px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Friends</h2>
        <div style={{ textAlign: 'center', padding: '24px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px' }}>
          <div style={{ color: theme.colors.goldDim, marginBottom: '12px' }}><Icons.Users size={32} /></div>
          <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textSecondary, fontSize: '13px', letterSpacing: '1px' }}>
            Use the Friends panel on the right side of the screen to manage your friends, send requests, and invite players to a game.
          </p>
          <p style={{ fontFamily: theme.fonts.mono, color: theme.colors.textMuted, fontSize: '11px', marginTop: '12px' }}>
            Your ID: <span style={{ color: theme.colors.gold, fontWeight: 700, fontSize: '14px' }}>{profile?.id}</span> — share it with friends!
          </p>
        </div>
      </div> */}

      {/* Security */}
      <div id="profile-security" style={{ paddingTop: '80px', paddingBottom: '40px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Security & 2FA</h2>
        
        <div style={{ padding: '24px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary, marginBottom: '4px' }}>Two-Factor Authentication</div>
              <div style={{ fontFamily: theme.fonts.mono, fontSize: '13px', color: sec.is2faEnabled ? theme.colors.hpHigh : theme.colors.textSecondary }}>{sec.is2faEnabled ? '✓ Enabled' : 'Not enabled'}</div>
            </div>
            
            {!sec.is2faEnabled && !isSettingUp2fa && (
              <button className="btn-press" onClick={handleEnable2faClick} style={{ padding: '8px 20px', background: `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`, border: 'none', borderRadius: '2px', color: theme.colors.bgDark, fontFamily: theme.fonts.heading, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer' }}>
                ENABLE
              </button>
            )}
            
            {sec.is2faEnabled && (
              <button className="btn-press" onClick={handleDisable2faClick} style={{ padding: '8px 20px', background: 'none', border: `1px solid ${theme.colors.dead}`, borderRadius: '2px', color: theme.colors.dead, fontFamily: theme.fonts.heading, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer' }}>
                DISABLE
              </button>
            )}
          </div>

          {isSettingUp2fa && (
            <div style={{ marginTop: '24px', padding: '20px', border: `1px dashed ${theme.colors.goldDim}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <p style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textPrimary, textAlign: 'center' }}>
                1. Scan this QR code with an app like Google Authenticator or Authy.
              </p>
              
              {qrCodeUrl && (
                <div style={{ background: 'white', padding: '12px', borderRadius: '8px' }}>
                  <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '160px', height: '160px' }} />
                </div>
              )}

              <p style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textPrimary, textAlign: 'center' }}>
                2. Enter the 6-digit code generated by the app to confirm.
              </p>
              
              <input 
                className="input-glow" 
                type="text" 
                maxLength={6} 
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                placeholder="- - - - - -"
                style={{ ...inputStyle, width: '140px', textAlign: 'center', letterSpacing: '1px', fontSize: '15px', fontWeight: 'bold' }} 
              />
              
              {error2fa && <div style={{ color: theme.colors.dead, fontFamily: theme.fonts.mono, fontSize: '12px' }}>{error2fa}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setIsSettingUp2fa(false)} style={{ padding: '8px 20px', background: 'none', border: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleConfirm2fa} style={{ padding: '8px 20px', background: theme.colors.hpHigh, border: 'none', color: theme.colors.bgDark, fontWeight: 'bold', cursor: 'pointer' }}>Confirm</button>
              </div>
            </div>
          )}
        </div>

        {/* Email Verification */}
        <div style={{ padding: '24px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary, marginBottom: '4px' }}>Email Verification</div>
              <div style={{ fontFamily: theme.fonts.mono, fontSize: '13px', color: sec.isEmailVerified ? theme.colors.hpHigh : theme.colors.dead }}>
                {sec.isEmailVerified ? '✓ Verified' : '✗ Not verified'}
              </div>
            </div>
            {!sec.isEmailVerified && (
              <button
                className="btn-press"
                onClick={async () => {
                  const result = await authService.resendVerification(email);
                  if (result.ok) setMsg("Verification email sent!");
                  else alert("Error: " + (result.message || "Failed to send"));
                }}
                style={{ padding: '8px 20px', background: 'none', border: `1px solid ${theme.colors.gold}`, borderRadius: '2px', color: theme.colors.gold, fontFamily: theme.fonts.heading, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer' }}
              >
                RESEND
              </button>
            )}
          </div>
        </div>

        {/* Linked Accounts */}
        <div style={{ padding: '24px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary, marginBottom: '4px' }}>Linked Accounts</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                {sec.linkedProviders && sec.linkedProviders.includes('GOOGLE') ? (
                  <><Icons.Google size={16} /><span style={{ fontFamily: theme.fonts.mono, fontSize: '13px', color: theme.colors.textSecondary }}>Google — Connected</span></>
                ) : (
                  <span style={{ fontFamily: theme.fonts.mono, fontSize: '13px', color: theme.colors.textMuted }}>No providers linked</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div style={{ padding: '24px', background: 'rgba(232,64,87,0.05)', border: `1px solid ${theme.colors.dead}`, borderRadius: '4px', marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: theme.fonts.heading, fontSize: '14px', fontWeight: 600, color: theme.colors.dead, marginBottom: '4px' }}>Delete Account</div>
            <div style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textMuted }}>
              Permanently delete your account and all associated data.
            </div>
          </div>
          <button className="btn-press" onClick={() => {
            setDeleteError('');
            confirmPwdRef.current = '';
            setConfirmPwdDisplay('');
            setDialog({
              isOpen: true,
              title: "Delete Account",
              msg: "Are you sure? This action is irreversible. Enter your password to confirm.",
              needsPassword: true,
              action: async () => {
                if (!confirmPwdRef.current) {
                  setDialog(prev => prev ? { ...prev, error: "Please enter your password to confirm." } : null);
                  return;
                }
                setDialog(null);
                const result = await api.deleteAccount(confirmPwdRef.current);
                confirmPwdRef.current = '';
                setConfirmPwdDisplay('');
                if (result.ok) {
                  window.location.reload();
                } else {
                  setDeleteError(result.message || "Error deleting account. Please try again.");
                }
              }
            });
          }} style={{
            padding: '8px 20px', background: 'none', border: `1px solid ${theme.colors.dead}`,
            borderRadius: '2px', color: theme.colors.dead, fontFamily: theme.fonts.heading,
            fontSize: '11px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer',
          }}>DELETE</button>
        </div>
        {deleteError && <span style={{ color: theme.colors.dead, fontSize: '12px', fontFamily: theme.fonts.mono, display: 'block', marginTop: '12px' }}>{deleteError}</span>}
      </div>

      {/* POPUP MODAL */}
      {dialog && dialog.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="animate-scaleIn" style={{ background: theme.colors.bgPanel, border: `1px solid ${theme.colors.gold}`, borderRadius: '4px', padding: '32px', maxWidth: '420px', textAlign: 'center', boxShadow: `0 0 40px ${theme.colors.goldGlow}` }}>
            <h3 style={{ fontFamily: theme.fonts.heading, color: theme.colors.goldBright, fontSize: '18px', marginBottom: '16px', letterSpacing: '1px' }}>{dialog.title}</h3>
            <p style={{ fontFamily: theme.fonts.mono, fontSize: '13px', color: theme.colors.textPrimary, marginBottom: dialog.needsPassword ? '16px' : '32px', lineHeight: 1.6 }}>
              {dialog.msg}
            </p>
            {dialog.needsPassword && (
              <input
                type="password"
                placeholder="Your actual password"
                value={confirmPwdDisplay}
                onChange={(e) => {
                  confirmPwdRef.current = e.target.value;
                  setConfirmPwdDisplay(e.target.value);
                  if (dialog.error) setDialog(prev => prev ? { ...prev, error: undefined } : null);
                }}
                style={{ ...inputStyle, marginBottom: dialog.error ? '12px' : '24px', textAlign: 'center' }}
                autoFocus
              />
            )}
            {dialog.error && <span style={{ color: theme.colors.dead, fontSize: '12px', fontFamily: theme.fonts.mono, display: 'block', marginBottom: '16px' }}>{dialog.error}</span>}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => { setDialog(null); confirmPwdRef.current = ''; setConfirmPwdDisplay(''); }} style={{ padding: '10px 24px', background: 'none', border: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted, cursor: 'pointer', fontFamily: theme.fonts.heading, letterSpacing: '1px' }}>CANCEL</button>
              <button onClick={dialog.action} style={{ padding: '10px 24px', background: theme.colors.dead, border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', fontFamily: theme.fonts.heading, letterSpacing: '1px' }}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}