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

  const navLink = (page: string): React.CSSProperties => ({
    ...navLinkBase,
    color: currentPage === page ? theme.colors.gold : theme.colors.textSecondary,
    borderBottom: currentPage === page ? `2px solid ${theme.colors.gold}` : '2px solid transparent',
  });

  const scrollTo = (page: string, sectionId: string) => {
    onNavigate(page);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
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

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '4px', flex: 1 }}>
        {/* Dashboard */}
        <div ref={dashboard.ref} style={{ position: 'relative', height: '100%' }}>
          <div className="gold-shimmer" style={{ ...navLink('dashboard'), gap: '4px' }}
            onClick={() => { onNavigate('dashboard'); dashboard.setOpen(false); }}
            onMouseEnter={() => dashboard.setOpen(true)}>
            <Icons.Sword size={16} /> Dashboard <Icons.ChevronDown size={14} />
          </div>
          <div onMouseLeave={() => dashboard.setOpen(false)}>
            <DropdownPanel isOpen={dashboard.open}>
              <DropdownItem icon={Icons.Gamepad} label="Game" onClick={() => { scrollTo('dashboard', 'section-game'); dashboard.setOpen(false); }} />
              <DropdownItem icon={Icons.Users} label="Characters" onClick={() => { scrollTo('dashboard', 'section-characters'); dashboard.setOpen(false); }} />
              <DropdownItem icon={Icons.Settings} label="Commands" onClick={() => { scrollTo('dashboard', 'section-commands'); dashboard.setOpen(false); }} />
            </DropdownPanel>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="gold-shimmer" style={navLink('leaderboard')} onClick={() => onNavigate('leaderboard')}>
          <Icons.Trophy size={16} /> Leaderboard
        </div>

        {/* Profile */}
        <div ref={profile.ref} style={{ position: 'relative', height: '100%' }}>
          <div className="gold-shimmer" style={{ ...navLink('profile'), gap: '4px' }}
            onClick={() => { onNavigate('profile'); profile.setOpen(false); }}
            onMouseEnter={() => profile.setOpen(true)}>
            <Icons.User size={16} /> Profile <Icons.ChevronDown size={14} />
          </div>
          <div onMouseLeave={() => profile.setOpen(false)}>
            <DropdownPanel isOpen={profile.open}>
              <DropdownItem icon={Icons.Settings} label="Settings" onClick={() => { scrollTo('profile', 'profile-settings'); profile.setOpen(false); }} />
              <DropdownItem icon={Icons.BarChart} label="Statistics" onClick={() => { scrollTo('profile', 'profile-stats'); profile.setOpen(false); }} />
              <DropdownItem icon={Icons.Users} label="Friends" onClick={() => { scrollTo('profile', 'profile-friends'); profile.setOpen(false); }} />
              <div style={{ height: '1px', background: theme.colors.border, margin: '4px 12px' }} />
              <DropdownItem icon={Icons.Shield} label="Security & 2FA" onClick={() => { scrollTo('profile', 'profile-security'); profile.setOpen(false); }} />
            </DropdownPanel>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Notifications */}
        <div ref={notif.ref} style={{ position: 'relative' }}>
          <button onClick={() => notif.setOpen(!notif.open)} style={{
            background: 'none', border: '1px solid transparent', borderRadius: '4px',
            padding: '8px', cursor: 'pointer',
            color: notif.open ? theme.colors.gold : theme.colors.textSecondary,
            transition: 'all 0.2s', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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

        {/* User avatar + name */}
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

        {/* Logout */}
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
    </nav>
  );
}