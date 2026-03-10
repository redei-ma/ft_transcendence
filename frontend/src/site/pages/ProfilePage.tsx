import { useState, useEffect } from 'react';
import { inputStyle, sectionTitleStyle } from '../styles/shared';
import * as Icons from '../components/Icons';
import * as api from '../services/apiService';
import { UserProfile, UserStats, UserSettings, generate2fa, turnOn2fa, turnOff2fa } from '../services/apiService';
import { theme } from '../../configs/theme';
import { NAVBAR_HEIGHT } from '../components/Navbar';
import { CharacterName } from '@transcendence/types';

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
  const [tempVal, setTempVal] = useState('');

  useEffect(() => {
    Promise.all([api.getMyProfile(), api.getMyStats(), api.getMySettings()])
      .then(([p, s, set]) => { 
        if (p) setProfile(p); 
        if (s) setStats(s); 
        if (set) setSettings(set); 
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveUsername = async () => { 
    if (await api.updateUsername(tempVal)) {
      setProfile((p) => p ? { ...p, username: tempVal } : null); 
    }
    setEditingUsername(false); 
  };
  
  const handleSaveEmail = async () => { 
    if (await api.updateEmail(tempVal)) {
      setProfile((p) => p ? { ...p, email: tempVal } : null); 
    }
    setEditingEmail(false); 
  };

  // ⚡ LE FUNZIONI ORA SONO DENTRO IL COMPONENTE, DOVE DEVONO STARE
  const handleEnable2faClick = async () => {
    setError2fa('');
    
    const data = await generate2fa();
    
    if (data && data.qrCode) { 
      setQrCodeUrl(data.qrCode);
      setIsSettingUp2fa(true);
    } else {
      alert("Il backend non ha risposto correttamente. Guarda la console (F12)!");
    }
  };

  const handleConfirm2fa = async () => {
    setError2fa('');
    const success = await turnOn2fa(setupCode);
    if (success) {
      setIsSettingUp2fa(false);
      setQrCodeUrl(null);
      setSetupCode('');
      setSettings(prev => prev ? { ...prev, is2faEnabled: true } : null);
    } else {
      setError2fa("Codice errato. Riprova.");
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
  
  const s: UserStats = stats || { eloCurrent: 0, eloPeak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, bestWinStreak: 0, totalKills: 0, totalDeaths: 1, characterStats: [] };
  const total = s.totalWins + s.totalLosses + s.totalDraws;
  const winRate = total > 0 ? Math.round((s.totalWins / total) * 100) : 0;
  
  const sec: UserSettings = settings || { is2faEnabled: false, isEmailVerified: false, linkedProviders: [] };

  return (
    <div className="animate-fadeIn" style={{ paddingTop: `${NAVBAR_HEIGHT}px`, maxWidth: '800px', margin: '0 auto', paddingBottom: '60px', paddingLeft: '24px', paddingRight: '24px' }}>
      
      {/* Settings & Personalization */}
      <div id="profile-settings" style={{ paddingTop: '40px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
            <img src={avatarUrl} alt="avatar" style={{ width: '120px', height: '120px', borderRadius: '50%', border: `3px solid ${theme.colors.gold}`, boxShadow: `0 0 30px ${theme.colors.goldGlow}` }} />
            <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: statusColor(userStatus), border: `3px solid ${theme.colors.bgDark}` }} />
          </div>
          <h1 style={{ fontFamily: theme.fonts.heading, fontSize: '28px', fontWeight: 700, color: theme.colors.goldBright, letterSpacing: '2px' }}>{username}</h1>
          <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, fontSize: '12px', letterSpacing: '1px', marginTop: '4px' }}>
            Member since {new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Settings & Personalization</h2>
        <EditableField label="USERNAME" value={username} isEditing={editingUsername} tempVal={tempVal} setTempVal={setTempVal} onEdit={() => setEditingUsername(true)} onSave={handleSaveUsername} onCancel={() => setEditingUsername(false)} />
        <EditableField label="EMAIL" value={email} isEditing={editingEmail} tempVal={tempVal} setTempVal={setTempVal} onEdit={() => setEditingEmail(true)} onSave={handleSaveEmail} onCancel={() => setEditingEmail(false)} />
      </div>

      {/* Statistics */}
      <div id="profile-stats" style={{ paddingTop: '80px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <StatBox label="ELO" value={s.eloCurrent} />
          <StatBox label="PEAK ELO" value={s.eloPeak} color={theme.colors.goldBright} />
          <StatBox label="WIN RATE" value={`${winRate}%`} color={theme.colors.zeus} />
          <StatBox label="BEST STREAK" value={s.bestWinStreak} color={theme.colors.zeus} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <StatBox label="WINS" value={s.totalWins} color={theme.colors.hpHigh} />
          <StatBox label="LOSSES" value={s.totalLosses} color={theme.colors.dead} />
          <StatBox label="K/D RATIO" value={s.totalDeaths > 0 ? (s.totalKills / s.totalDeaths).toFixed(2) : '0'} />
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

      {/* Friends */}
      <div id="profile-friends" style={{ paddingTop: '80px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Friends</h2>
        <p style={{ fontFamily: theme.fonts.heading, color: theme.colors.textMuted, textAlign: 'center', letterSpacing: '2px', fontSize: '13px' }}>Coming soon</p>
      </div>

      {/* Security */}
      <div id="profile-security" style={{ paddingTop: '80px', paddingBottom: '40px', scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '22px', marginBottom: '24px' }}>Security & 2FA</h2>
        
        {/* ⚡ Blocco 2FA ripristinato con i bottoni corretti */}
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

          {/* Box con il QR Code */}
          {isSettingUp2fa && (
            <div style={{ marginTop: '24px', padding: '20px', border: `1px dashed ${theme.colors.goldDim}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <p style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textPrimary, textAlign: 'center' }}>
                1. Inquadra questo QR con un'app come Google Authenticator o Authy.
              </p>
              
              {qrCodeUrl && (
                <div style={{ background: 'white', padding: '12px', borderRadius: '8px' }}>
                  <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '160px', height: '160px' }} />
                </div>
              )}

              <p style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textPrimary, textAlign: 'center' }}>
                2. Inserisci il codice a 6 cifre generato dall'app per confermare.
              </p>
              
              <input 
                className="input-glow" 
                type="text" 
                maxLength={6} 
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                placeholder="123456"
                style={{ ...inputStyle, width: '140px', textAlign: 'center', letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold' }} 
              />
              
              {error2fa && <div style={{ color: theme.colors.dead, fontFamily: theme.fonts.mono, fontSize: '12px' }}>{error2fa}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setIsSettingUp2fa(false)} style={{ padding: '8px 20px', background: 'none', border: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted, cursor: 'pointer' }}>Annulla</button>
                <button onClick={handleConfirm2fa} style={{ padding: '8px 20px', background: theme.colors.hpHigh, border: 'none', color: theme.colors.bgDark, fontWeight: 'bold', cursor: 'pointer' }}>Conferma</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px', background: theme.colors.bgPanel, border: `1px solid ${theme.colors.border}`, borderRadius: '4px', marginBottom: '12px' }}>
          <div style={{ fontFamily: theme.fonts.heading, fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary, marginBottom: '4px' }}>Email Verification</div>
          <div style={{ fontFamily: theme.fonts.mono, fontSize: '13px', color: sec.isEmailVerified ? theme.colors.hpHigh : theme.colors.dead }}>{sec.isEmailVerified ? '✓ Verified' : '✗ Not verified'}</div>
        </div>
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
      
    </div>
  );
}