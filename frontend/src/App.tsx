import { useState, useEffect, useCallback, useRef } from 'react';
import { getMyProfile, UserProfile, getGameInvites, GameInvite, respondGameInvite } from './site/services/apiService';
import './site/styles/site.css';
import LoginPage from './site/pages/LoginPage';
import DashboardPage from './site/pages/DashboardPage';
import LeaderboardPage from './site/pages/LeaderboardPage';
import ProfilePage from './site/pages/ProfilePage';
import GameFlow from './site/pages/GameFlow';
import Navbar from './site/components/Navbar';
import { logout, refreshToken } from './site/services/authService';
import { theme } from './configs/theme';
import DesktopOnlyGuard from './site/components/desktopOnlyGuard';
import FriendsSidebar from './site/components/FriendSidebar';
import GameInviteToast from './site/components/GameInviteToast';

export default function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingInviterId, setPendingInviterId] = useState<number | null>(null);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);

  const fetchGameInvites = useCallback(async () => {
    const data = await getGameInvites();
    if (data) setGameInvites(data.invites);
  }, []);

  // SSE — connessione persistente per notifiche, status amici, inviti
  const sseRetryDelayRef = useRef(3000);
  const sseRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const SSE_URL = '/api/users/me/notifications/stream';
    let es: EventSource | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      es = new EventSource(SSE_URL, { withCredentials: true });

      es.addEventListener('notification', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent('new-notification', { detail: data }));
          if (data.type === 'FRIEND_ACCEPTED' || data.type === 'FRIEND_REQ') {
            window.dispatchEvent(new CustomEvent('friend-list-changed'));
          }
        } catch {}
      });

      es.addEventListener('friend_status', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent('friend-status-update', { detail: data }));
        } catch {}
      });

      es.addEventListener('game_invite', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent('game-invite-received', { detail: data }));
        } catch {}
      });

      es.addEventListener('friend_removed', () => {
        window.dispatchEvent(new CustomEvent('friend-list-changed'));
      });

      es.addEventListener('game_invite_declined', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent('game-invite-declined', { detail: data }));
        } catch {}
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (destroyed) return;
        const delay = sseRetryDelayRef.current;
        sseRetryDelayRef.current = Math.min(delay * 2, 30000);
        sseRetryTimerRef.current = setTimeout(connect, delay);
      };

      es.onopen = () => {
        sseRetryDelayRef.current = 3000;
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (sseRetryTimerRef.current) clearTimeout(sseRetryTimerRef.current);
      es?.close();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchGameInvites();
    const handler = (e: Event) => {
      const invite = (e as CustomEvent<GameInvite>).detail;
      setGameInvites(prev => {
        if (prev.some(i => i.id === invite.id)) return prev;
        return [invite, ...prev];
      });
    };
    window.addEventListener('game-invite-received', handler);
    return () => window.removeEventListener('game-invite-received', handler);
  }, [isLoggedIn, fetchGameInvites]);

  const handleAcceptInvite = useCallback(async (invite: GameInvite) => {
    const result = await respondGameInvite(invite.id, 'ACCEPTED');
    if (result.ok && result.sessionId) {
      setGameInvites(prev => prev.filter(i => i.id !== invite.id));
      setPendingSessionId(result.sessionId);
      setPendingInviterId(invite.sender.id);
      setCurrentPage('play');
    }
  }, []);

  const handleDeclineInvite = useCallback(async (invite: GameInvite) => {
    const result = await respondGameInvite(invite.id, 'REJECTED');
    if (result.ok) {
      setGameInvites(prev => prev.filter(i => i.id !== invite.id));
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const hasSession = await refreshToken();
      if (!hasSession) {
        setIsLoggedIn(false);
        setIsAuthLoading(false);
        return;
      }
      const profile = await getMyProfile();
      if (profile) {
        setUser(profile);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
      setIsAuthLoading(false);
    };
    initAuth();
  }, []);

  const handleLogin = async () => {
    const profile = await getMyProfile();
    if (profile) {
      setUser(profile);
      setIsLoggedIn(true);
      setCurrentPage('dashboard');
    } else {
      console.error('Login riuscito, ma impossibile recuperare il profilo.');
      await logout();
      setIsLoggedIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage('dashboard');
  };

  // const handleGameInviteAccepted = (sessionId: string, inviterId?: number) => {
  //   setPendingSessionId(sessionId);
  //   if (inviterId) setPendingInviterId(inviterId);
  //   setCurrentPage('play');
  // };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  if (isAuthLoading) return null;

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentPage === 'play') {
    if (!user) {
      alert(
        'Errore di sessione: Dati utente mancanti. Effettua nuovamente il login.',
      );
      handleLogout();
      return null;
    }

    return (
      <>
        <DesktopOnlyGuard>
          <GameFlow
            userId={user.id}
            username={user.username}
            onExit={async () => { await refreshToken(); setPendingSessionId(null); setPendingInviterId(null); setCurrentPage('dashboard'); }}
            sessionId={pendingSessionId}
            inviterId={pendingInviterId}
          />
        </DesktopOnlyGuard>
        <FriendsSidebar
          onGameInviteAccepted={(sessionId) => { setPendingSessionId(sessionId); setCurrentPage('play'); }}
          gameInvites={gameInvites}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={handleDeclineInvite}
        />
        <GameInviteToast
          invites={gameInvites}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.bgDark }}>
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        username={user?.username || ''}
        avatarUrl={user?.avatarUrl || ''}
      />
      {renderPage()}
      <FriendsSidebar
        onGameInviteAccepted={(sessionId) => { setPendingSessionId(sessionId); setCurrentPage('play'); }}
        gameInvites={gameInvites}
        onAcceptInvite={handleAcceptInvite}
        onDeclineInvite={handleDeclineInvite}
      />
      <GameInviteToast
        invites={gameInvites}
        onAccept={handleAcceptInvite}
        onDecline={handleDeclineInvite}
      />
    </div>
  );
}
