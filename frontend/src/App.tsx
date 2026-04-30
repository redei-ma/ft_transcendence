import { useState, useEffect } from "react";
import "./site/styles/site.css";
import LoginPage from "./site/pages/LoginPage";
import DashboardPage from "./site/pages/DashboardPage";
import LeaderboardPage from "./site/pages/LeaderboardPage";
import ProfilePage from "./site/pages/ProfilePage";
import GameFlow from "./site/pages/GameFlow";
import Navbar from "./site/components/Navbar";
import { logout } from "./site/services/authService";
import { getMyProfile, UserProfile } from "./site/services/apiService";
import { theme } from "./configs/theme";
import DesktopOnlyGuard from "./site/components/desktopOnlyGuard";
import FriendsSidebar from "./site/components/FriendSidebar";
import GameInviteToast from "./site/components/GameInviteToast";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    const initAuth = async () => {
      const profile = await getMyProfile();
      if (profile) {
        setUser(profile);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };
    initAuth();
  }, []);

  const handleLogin = async () => {
    const profile = await getMyProfile();
    if (profile) {
      setUser(profile);
      setIsLoggedIn(true);
      setCurrentPage("dashboard");
    } else {
      console.error("Login riuscito, ma impossibile recuperare il profilo.");
      await logout();
      setIsLoggedIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage("dashboard");
  };

  const handleGameInviteAccepted = (sessionId: string) => {
    setCurrentPage("play");
    console.log("[App] Game invite accepted, sessionId:", sessionId);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "leaderboard":
        return <LeaderboardPage />;
      case "profile":
        return <ProfilePage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentPage === "play") {
    if (!user) {
      alert("Errore di sessione: Dati utente mancanti. Effettua nuovamente il login.");
      handleLogout();
      return null;
    }
    
    return (
      <>
        <DesktopOnlyGuard>
          <GameFlow
            userId={user.id}
            username={user.username}
            onExit={() => setCurrentPage("dashboard")}
          />
        </DesktopOnlyGuard>
        <FriendsSidebar onGameInviteAccepted={handleGameInviteAccepted} />
        <GameInviteToast onAccepted={handleGameInviteAccepted} />
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.colors.bgDark }}>
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        username={user?.username || ""}
        avatarUrl={user?.avatarUrl || ""}
      />
      {renderPage()}
      <FriendsSidebar onGameInviteAccepted={handleGameInviteAccepted} />
      <GameInviteToast onAccepted={handleGameInviteAccepted} />
    </div>
  );
}