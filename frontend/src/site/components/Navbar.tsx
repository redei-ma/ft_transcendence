import { useState, useEffect } from 'react';
import { navLinkBase } from '../styles/shared';
import { useDropdown, DropdownPanel, DropdownItem } from './Dropdown';
import * as Icons from './Icons';
import { theme } from '../../configs/theme';

export const NAVBAR_HEIGHT = 64;

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  username: string;
  avatarUrl: string;
}

export default function Navbar({ currentPage, onNavigate, onLogout, username, avatarUrl }: NavbarProps) {
  const dashboard = useDropdown();
  const profile = useDropdown();
  const notif = useDropdown();

  // ⚡ Stati per la responsività
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 850);
      if (window.innerWidth >= 850) {
        setMobileMenuOpen(false); // Chiude il menu se allarghiamo lo schermo
      }
    };
    
    handleResize(); // Check iniziale
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLink = (page: string): React.CSSProperties => ({
    ...navLinkBase,
    color: currentPage === page ? theme.colors.gold : theme.colors.textSecondary,
    borderBottom: currentPage === page ? `2px solid ${theme.colors.gold}` : '2px solid transparent',
  });

  const scrollTo = (page: string, sectionId: string) => {
    onNavigate(page);
    setMobileMenuOpen(false); // Chiude il menu mobile se aperto
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: `${NAVBAR_HEIGHT}px`,
        background: `linear-gradient(180deg, ${theme.colors.bgPanel} 0%, ${theme.colors.bgDark} 100%)`,
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex', alignItems: 'center', padding: '0 24px',
        zIndex: 999, backdropFilter: 'blur(12px)',
      }}>
        {/* Logo (Sempre visibile) */}
        <div onClick={() => onNavigate('dashboard')} style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginRight: '32px', flexShrink: 0, cursor: 'pointer',
        }}>
          <div style={{
            width: '40px', height: '40px',
            background: `linear-gradient(135deg, ${theme.colors.goldDark}, ${theme.colors.gold}, ${theme.colors.goldBright})`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '34px', height: '34px', background: theme.colors.bgDark,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.gold,
            }}>
              <Icons.Zap size={18} />
            </div>
          </div>
        </div>

        {/* ⚡ LOGICA RESPONSIVE */}
        {isMobile ? (
          /* ================= LAYOUT MOBILE ================= */
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            
            {/* Notifiche su mobile */}
            <div ref={notif.ref} style={{ position: 'relative' }}>
              <button onClick={() => notif.setOpen(!notif.open)} style={{
                background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                color: notif.open ? theme.colors.gold : theme.colors.textSecondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icons.Bell size={24} />
              </button>
              <DropdownPanel isOpen={notif.open} right={0} minWidth="240px">
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{ fontFamily: theme.fonts.heading, fontSize: '12px', color: theme.colors.textMuted }}>
                    No notifications yet
                  </span>
                </div>
              </DropdownPanel>
            </div>

            {/* Hamburger Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: mobileMenuOpen ? theme.colors.gold : theme.colors.textSecondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px'
              }}
            >
              {mobileMenuOpen ? <Icons.X size={28} /> : <Icons.Menu size={28} />}
            </button>
          </div>

        ) : (
          /* ================= LAYOUT DESKTOP ================= */
          <>
            {/* Nav Links centrali */}
            <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '4px', flex: 1 }}>
              <div ref={dashboard.ref} style={{ position: 'relative', height: '100%' }}>
                <div className="gold-shimmer" style={{ ...navLink('dashboard'), gap: '4px' }}
                  onClick={() => { onNavigate('dashboard'); dashboard.setOpen(false); }}
                  onMouseEnter={() => dashboard.setOpen(true)}>
                  <Icons.Sword size={16} /> Dashboard <Icons.ChevronDown size={14} />
                </div>
                <div onMouseLeave={() => dashboard.setOpen(false)}>
                  <DropdownPanel isOpen={dashboard.open}>
                    <DropdownItem icon={Icons.Gamepad} label="Game" onClick={() => scrollTo('dashboard', 'section-game')} />
                    <DropdownItem icon={Icons.Users} label="Characters" onClick={() => scrollTo('dashboard', 'section-characters')} />
                    <DropdownItem icon={Icons.Settings} label="Commands" onClick={() => scrollTo('dashboard', 'section-commands')} />
                  </DropdownPanel>
                </div>
              </div>

              <div className="gold-shimmer" style={navLink('leaderboard')} onClick={() => onNavigate('leaderboard')}>
                <Icons.Trophy size={16} /> Leaderboard
              </div>

              <div ref={profile.ref} style={{ position: 'relative', height: '100%' }}>
                <div className="gold-shimmer" style={{ ...navLink('profile'), gap: '4px' }}
                  onClick={() => { onNavigate('profile'); profile.setOpen(false); }}
                  onMouseEnter={() => profile.setOpen(true)}>
                  <Icons.User size={16} /> Profile <Icons.ChevronDown size={14} />
                </div>
                <div onMouseLeave={() => profile.setOpen(false)}>
                  <DropdownPanel isOpen={profile.open}>
                    <DropdownItem icon={Icons.Settings} label="Settings" onClick={() => scrollTo('profile', 'profile-settings')} />
                    <DropdownItem icon={Icons.BarChart} label="Statistics" onClick={() => scrollTo('profile', 'profile-stats')} />
                    <DropdownItem icon={Icons.Users} label="Friends" onClick={() => scrollTo('profile', 'profile-friends')} />
                    <div style={{ height: '1px', background: theme.colors.border, margin: '4px 12px' }} />
                    <DropdownItem icon={Icons.Shield} label="Security & 2FA" onClick={() => scrollTo('profile', 'profile-security')} />
                  </DropdownPanel>
                </div>
              </div>
            </div>

            {/* Lato Destro (Notifiche, Avatar, Logout) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div ref={notif.ref} style={{ position: 'relative' }}>
                <button onClick={() => notif.setOpen(!notif.open)} style={{
                  background: 'none', border: '1px solid transparent', borderRadius: '4px',
                  padding: '8px', cursor: 'pointer',
                  color: notif.open ? theme.colors.gold : theme.colors.textSecondary,
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icons.Bell size={20} />
                </button>
                <DropdownPanel isOpen={notif.open} right={0} minWidth="280px">
                  <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontFamily: theme.fonts.heading, fontSize: '12px', color: theme.colors.textMuted, letterSpacing: '1px' }}>
                      No notifications yet
                    </span>
                  </div>
                </DropdownPanel>
              </div>

              <div onClick={() => onNavigate('profile')} style={{
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                padding: '4px 8px', borderRadius: '4px', transition: 'background 0.2s',
              }}>
                <img src={avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${username}`} alt="Avatar"
                  style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${theme.colors.border}` }} />
                <span style={{ fontFamily: theme.fonts.heading, fontSize: '12px', color: theme.colors.textSecondary, letterSpacing: '0.5px' }}>
                  {username}
                </span>
              </div>

              <button onClick={onLogout} title="Logout" style={{
                background: 'none', border: '1px solid transparent', borderRadius: '4px',
                padding: '8px', cursor: 'pointer', color: theme.colors.textSecondary,
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.colors.dead; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.colors.textSecondary; }}>
                <Icons.LogOut size={20} />
              </button>
            </div>
          </>
        )}
      </nav>

      {/* ================= OVERLAY DEL MENU MOBILE ================= */}
      {isMobile && mobileMenuOpen && (
        <div className="animate-fadeIn" style={{
          position: 'fixed', top: NAVBAR_HEIGHT, left: 0, right: 0, bottom: 0,
          background: `linear-gradient(180deg, ${theme.colors.bgDark} 0%, ${theme.colors.bg} 100%)`,
          zIndex: 998, padding: '24px', display: 'flex', flexDirection: 'column',
          overflowY: 'auto'
        }}>
          
          {/* Avatar e Nome Mobile */}
          <div onClick={() => scrollTo('profile', 'profile-settings')} style={{
            display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '24px', 
            borderBottom: `1px solid ${theme.colors.border}`, cursor: 'pointer'
          }}>
            <img src={avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${username}`} alt="Avatar"
              style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${theme.colors.gold}` }} />
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '18px', color: theme.colors.goldBright, fontWeight: 700 }}>
                {username}
              </div>
              <div style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.textMuted }}>
                Visualizza Profilo
              </div>
            </div>
          </div>

          {/* Link Principali */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px', flex: 1 }}>
            
            <div onClick={() => scrollTo('dashboard', 'section-game')} style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '8px',
              background: currentPage === 'dashboard' ? 'rgba(200, 170, 100, 0.1)' : 'transparent',
              color: currentPage === 'dashboard' ? theme.colors.gold : theme.colors.textPrimary,
              fontFamily: theme.fonts.heading, fontSize: '18px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
              cursor: 'pointer'
            }}>
              <Icons.Sword size={24} /> Dashboard
            </div>

            <div onClick={() => scrollTo('leaderboard', '')} style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '8px',
              background: currentPage === 'leaderboard' ? 'rgba(200, 170, 100, 0.1)' : 'transparent',
              color: currentPage === 'leaderboard' ? theme.colors.gold : theme.colors.textPrimary,
              fontFamily: theme.fonts.heading, fontSize: '18px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
              cursor: 'pointer'
            }}>
              <Icons.Trophy size={24} /> Leaderboard
            </div>

          </div>

          {/* Logout Mobile */}
          <button onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            width: '100%', padding: '16px', marginTop: '24px',
            background: 'rgba(232, 64, 87, 0.1)', border: `1px solid ${theme.colors.dead}`,
            borderRadius: '4px', color: theme.colors.dead, fontFamily: theme.fonts.heading,
            fontSize: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer'
          }}>
            <Icons.LogOut size={20} /> Logout
          </button>
        </div>
      )}
    </>
  );
}