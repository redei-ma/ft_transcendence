import { useState, useEffect } from 'react';
import { navLinkBase } from '../styles/shared';
import { useDropdown, DropdownPanel, DropdownItem } from './Dropdown';
import * as Icons from './Icons';
import { theme } from '../../configs/theme';
import * as api from '../services/apiService';
import { NotificationItem } from '../services/apiService';

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

  // Stati per la responsività
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Stati per le Notifiche
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Funzione per il caricamento iniziale (storico)
  const fetchNotifications = async () => {
    if (!username) return; 
    const data = await api.getNotifications(1, 20);
    if (data) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 850);
      if (window.innerWidth >= 850) {
        setMobileMenuOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Integrazione SSE (Server-Sent Events) per le Notifiche Live
useEffect(() => {
    if (!username) return;

    // 1. Carica lo storico iniziale
    fetchNotifications();

    // 2. Apri il canale SSE per ricevere eventi in tempo reale
    const SSE_URL = '/api/users/me/notifications/stream';
    
    const eventSource = new EventSource(SSE_URL, {
      withCredentials: true // FONDAMENTALE per far leggere i cookie di sessione a NestJS
    });

    // 3. Evento "notification" — una nuova notifica (friend request, achievement, ecc.)
    //    Renato manda: { id, type, message }
    //    Lo aggiungiamo in cima alla lista e incrementiamo il contatore non-letti.
    eventSource.addEventListener('notification', (event: any) => {
      try {
        const newNotif: NotificationItem = JSON.parse(event.data);
        setNotifications(prev => [newNotif, ...prev]);
        if (!newNotif.isRead) {
          setUnreadCount(prev => prev + 1);
        }
        if (newNotif.type === 'FRIEND_ACCEPTED' || newNotif.type === 'FRIEND_REQ') {
          window.dispatchEvent(new CustomEvent('friend-list-changed'));
        }
      } catch (err) {
        console.error("[SSE] Errore nel parsing della notifica:", err);
      }
    });

    // 4. Evento "friend_status" — un amico ha cambiato stato (ONLINE, OFFLINE, IN_GAME, IN_QUEUE)
    eventSource.addEventListener('friend_status', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('friend-status-update', { detail: data }));
      } catch (err) {
        console.error("[SSE] Errore nel parsing del friend_status:", err);
      }
    });

    // 5. Evento "game_invite" — qualcuno ha mandato un invite di gioco
    eventSource.addEventListener('game_invite', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('game-invite-received', { detail: data }));
      } catch (err) {
        console.error("[SSE] Errore nel parsing del game_invite:", err);
      }
    });

    // 6. Evento "friend_removed" — un amico ci ha rimosso o ha eliminato l'account
    eventSource.addEventListener('friend_removed', () => {
      window.dispatchEvent(new CustomEvent('friend-list-changed'));
    });

    // 7. Evento "game_invite_declined" — qualcuno ha rifiutato il nostro invite
    eventSource.addEventListener('game_invite_declined', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('game-invite-declined', { detail: data }));
      } catch (err) {
        console.error("[SSE] Errore nel parsing di game_invite_declined:", err);
      }
    });

    eventSource.onerror = () => {
      console.error("[SSE] Errore di connessione al flusso. Tentativo di riconnessione automatico...");
      // L'EventSource del browser proverà a riconnettersi automaticamente, 
      // non c'è bisogno di logiche di reconnect.
    };

    // Cleanup: chiudiamo il "tubo" se cambiamo utente o il componente viene smontato
    return () => {
      eventSource.close();
    };
  }, [username]);

  const handleMarkAllRead = async () => {
    if (await api.markAllNotificationsRead()) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const handleNotifClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      const ok = await api.markNotificationRead(n.id);
      if (ok) {
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
    notif.setOpen(false);
    
    // Indirizzamento specifico in base al tipo di notifica
    if (n.type === 'FRIEND_REQ' || n.type === 'FRIEND_ACCEPTED') {
      scrollTo('profile', 'profile-friends');
    } else if (n.type === 'ACHV_UNLOCKED') {
      scrollTo('profile', 'profile-stats');
    }
  };

  const handleDeleteNotif = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const ok = await api.deleteNotification(id);
    if (ok) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Se eliminiamo una non-letta, dobbiamo scalare anche l'unreadCount 
      // (ma per sicurezza il modo migliore è rifare la fetch se lo vogliamo preciso, 
      // o semplicemente sottrarlo localmente come fatto sotto).
      const deletedNotif = notifications.find(n => n.id === id);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const timeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const navLink = (page: string): React.CSSProperties => ({
    ...navLinkBase,
    color: currentPage === page ? theme.colors.gold : theme.colors.textSecondary,
    borderBottom: currentPage === page ? `2px solid ${theme.colors.gold}` : '2px solid transparent',
  });

  const scrollTo = (page: string, sectionId: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // ================= UI NOTIFICHE CONDIVISA =================
  const RenderNotificationList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${theme.colors.border}` }}>
        <span style={{ fontFamily: theme.fonts.heading, fontSize: '14px', color: theme.colors.goldBright, fontWeight: 700 }}>Notifications</span>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: theme.colors.textMuted, fontSize: '11px', fontFamily: theme.fonts.heading, cursor: 'pointer', textTransform: 'uppercase' }}>
            Mark all read
          </button>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <span style={{ fontFamily: theme.fonts.heading, fontSize: '12px', color: theme.colors.textMuted, letterSpacing: '1px' }}>
              No notifications yet
            </span>
          </div>
        ) : (
          notifications.map(n => {
            const isAchv = n.type === 'ACHV_UNLOCKED';
            return (
              <div key={n.id} onClick={() => handleNotifClick(n)} style={{
                padding: '12px 16px', borderBottom: `1px solid rgba(255,255,255,0.05)`,
                background: n.isRead ? 'transparent' : 'rgba(200, 170, 100, 0.08)',
                cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start',
                transition: 'background 0.2s'
              }}>
                <div style={{ color: isAchv ? theme.colors.hpMid : theme.colors.zeus, marginTop: '2px' }}>
                  {isAchv ? <Icons.Trophy size={16} /> : <Icons.User size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: theme.fonts.mono, fontSize: '12px', color: n.isRead ? theme.colors.textSecondary : theme.colors.textPrimary, lineHeight: 1.4, margin: 0 }}>
                    {n.message}
                  </p>
                  <p style={{ fontFamily: theme.fonts.mono, fontSize: '10px', color: theme.colors.textMuted, marginTop: '4px' }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                <button onClick={(e) => handleDeleteNotif(e, n.id)} style={{ background: 'none', border: 'none', color: theme.colors.textMuted, cursor: 'pointer', opacity: 0.5, padding: '2px' }}>
                  <Icons.X size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

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
        {/* Logo */}
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

        {/* LOGICA RESPONSIVE */}
        {isMobile ? (
          /* ================= LAYOUT MOBILE ================= */
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            
            {/* Notifiche su mobile */}
            <div ref={notif.ref} style={{ position: 'relative' }}>
              <button onClick={() => notif.setOpen(!notif.open)} style={{
                background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                color: notif.open ? theme.colors.gold : theme.colors.textSecondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}>
                <Icons.Bell size={24} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 2, background: theme.colors.dead, color: '#fff', fontSize: '9px', fontWeight: 'bold', width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <DropdownPanel isOpen={notif.open} right={0} minWidth="280px">
                <RenderNotificationList />
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
                    <DropdownItem icon={Icons.BarChart} label="Match History" onClick={() => scrollTo('profile', 'profile-matches')} />
                    <DropdownItem icon={Icons.Trophy} label="Achievements" onClick={() => scrollTo('profile', 'profile-achievements')} />
                    <DropdownItem icon={Icons.Users} label="Friends" onClick={() => scrollTo('profile', 'profile-friends')} />
                    <div style={{ height: '1px', background: theme.colors.border, margin: '4px 12px' }} />
                    <DropdownItem icon={Icons.Shield} label="Security & 2FA" onClick={() => scrollTo('profile', 'profile-security')} />
                  </DropdownPanel>
                </div>
              </div>
            </div>

            {/* Lato Destro (Notifiche, Avatar, Logout) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              
              {/* Notifiche Desktop */}
              <div ref={notif.ref} style={{ position: 'relative' }}>
                <button onClick={() => notif.setOpen(!notif.open)} style={{
                  background: 'none', border: '1px solid transparent', borderRadius: '4px',
                  padding: '8px', cursor: 'pointer', position: 'relative',
                  color: notif.open ? theme.colors.gold : theme.colors.textSecondary,
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icons.Bell size={20} />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 2, background: theme.colors.dead, color: '#fff', fontSize: '9px', fontWeight: 'bold', width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.colors.bgPanel}` }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <DropdownPanel isOpen={notif.open} right={0} minWidth="320px">
                  <RenderNotificationList />
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