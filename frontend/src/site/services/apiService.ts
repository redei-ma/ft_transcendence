
import { fetchWithAuthRetry } from "./authService";

export interface UserProfile {
    id: number;
    username: string;
    avatarUrl: string;
    email: string;
    status: "ONLINE" | "OFFLINE" | "IN_GAME" | string;
    createdAt: string;
}

export interface CharacterStat {
    characterName: string;
    wins: number;
    losses: number;
    kills: number;
    deaths: number;
}

export interface UserStats {
    eloCurrent: number;
    eloPeak: number;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    bestWinStreak: number;
    currentWinStreak: number;
    totalKills: number;
    totalDeaths: number;
    characterStats: CharacterStat[];
}

export interface UserSettings {
    is2faEnabled: boolean;
    isEmailVerified: boolean;
    linkedProviders: string[];
}

export interface LeaderboardEntry {
    id: number;
    rank: number;
    username: string;
    avatarUrl: string;
    eloCurrent: number;
    totalWins: number;
    totalLosses: number;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    total?: number;
}

// Interfacce Notifiche
export interface NotificationItem {
    id: number;
    type: string; // FRIEND_REQ, FRIEND_ACCEPTED, ACHV_UNLOCKED
    message: string;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationListResponse {
    notifications: NotificationItem[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
}

export interface FriendUser {
    id: number;
    username: string;
    avatarUrl: string;
    status: string;
}

export interface FriendEntry {
    id: number;
    friend: FriendUser;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    direction: 'SENT' | 'RECEIVED';
    createdAt: string;
    updatedAt: string;
}

export interface FriendListResponse {
    friends: FriendEntry[];
    total: number;
}

export interface FriendRequestsResponse {
    sent: FriendEntry[];
    received: FriendEntry[];
}

export interface GameInvite {
    id: number;
    sender: FriendUser;
    receiver: FriendUser;
    status: string;
    createdAt: string;
    expiresAt: string;
}

export interface GameInviteListResponse {
    invites: GameInvite[];
    total: number;
}

export interface Achievement {
    name: string;
    description: string;
    iconPath: string;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    unlockedAt: string;
}

export interface UserAchievementsResponse {
    unlocked: Achievement[];
    unlockedCount: number;
    totalCount: number;
}


// ==========================================
// 📡 CHIAMATE API GENERALI
// ==========================================

export async function getMyProfile(): Promise<UserProfile | null> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me");
        if (!res || !res.ok) return null;
        return (await res.json()) as UserProfile;
    } catch (error) {
        console.error("[API] Error fetching profile:", error);
        return null;
    }
}

export async function getMyStats(): Promise<UserStats | null> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/stats");
        if (!res || !res.ok) return null;
        return (await res.json()) as UserStats;
    } catch (error) {
        console.error("[API] Error fetching stats:", error);
        return null;
    }
}

export async function getMySettings(): Promise<UserSettings | null> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/settings");
        if (!res || !res.ok) return null;
        return (await res.json()) as UserSettings;
    } catch (error) {
        console.error("[API] Error fetching settings:", error);
        return null;
    }
}

export async function updateUsername(username: string): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/username", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        });
        return !!res && res.ok;
    } catch (error) {
        console.error("[API] Error updating username:", error);
        return false;
    }
}

export async function updateEmail(email: string): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/email", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        return !!res && res.ok;
    } catch (error) {
        console.error("[API] Error updating email:", error);
        return false;
    }
}

export async function updateAvatar(avatarUrl: string | null): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/avatar", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarUrl }),
        });
        return !!res && res.ok;
    } catch (error) {
        console.error("[API] Error updating avatar:", error);
        return false;
    }
}

export async function getLeaderboard(
    page = 1,
    limit = 20,
): Promise<LeaderboardResponse | null> {
    try {
        const res = await fetchWithAuthRetry(
            `/api/users/leaderboard?page=${page}&limit=${limit}`,
        );
        if (!res || !res.ok) return null;
        return (await res.json()) as LeaderboardResponse;
    } catch (error) {
        console.error("[API] Error fetching leaderboard:", error);
        return null;
    }
}

export async function getPublicProfile(
    userId: number,
): Promise<UserProfile | null> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/${userId}`);
        if (!res || !res.ok) return null;
        return (await res.json()) as UserProfile;
    } catch (error) {
        console.error("[API] Error fetching public profile:", error);
        return null;
    }
}

export async function checkUsernameAvailable(
    username: string,
): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry(
            `/api/users/check/username?username=${encodeURIComponent(username)}`,
        );
        if (!res || !res.ok) return false;
        const data = await res.json();
        return !data.exists;
    } catch (error) {
        console.error("[API] Error checking username:", error);
        return false;
    }
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry(
            `/api/users/check/email?email=${encodeURIComponent(email)}`,
        );
        if (!res || !res.ok) return false;
        const data = await res.json();
        return !data.exists;
    } catch (error) {
        console.error("[API] Error checking email:", error);
        return false;
    }
}

// --- 2FA & AUTH SETUP ---

export async function generate2fa() {
  try {
    const res = await fetchWithAuthRetry("/api/auth/2fa/setup", { method: "POST" });
    if (!res || !res.ok) return null;
    return await res.json(); 
  } catch (error) {
    console.error("[API] Error generating 2FA:", error);
    return null;
  }
}

export async function turnOn2fa(code: string): Promise<boolean> {
  try {
    const res = await fetchWithAuthRetry("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    return !!res && res.ok;
  } catch (error) {
    console.error("[API] Error turning on 2FA:", error);
    return false;
  }
}

export async function turnOff2fa(): Promise<boolean> {
  try {
    const res = await fetchWithAuthRetry("/api/auth/2fa/disable", { method: "POST" });
    return !!res && res.ok;
  } catch (error) {
    console.error("[API] Error turning off 2FA:", error);
    return false;
  }
}

export async function requestEmailChange(password: string, newEmail: string): Promise<{ok: boolean, message?: string}> {
  try {
    const res = await fetchWithAuthRetry("/api/auth/change-email-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, newEmail }), 
    });

    if (!res) return { ok: false, message: "Connessione al server fallita" };

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, message: data.message || data.error };
  } catch (error) {
    return { ok: false, message: "Network error" };
  }
}

export async function changePassword(oldPass: string, newPass: string): Promise<{ok: boolean, message?: string}> {
  try {
    const res = await fetchWithAuthRetry("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPass, newPass }),
    });
    
    if (!res) return { ok: false, message: "Connessione al server fallita" };

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, message: data.message || data.error };
  } catch (error) {
    return { ok: false, message: "Network error" };
  }
}

// ==========================================
// NOTIFICHE
// ==========================================

export async function getNotifications(page = 1, limit = 20, unreadOnly = false): Promise<NotificationListResponse | null> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);
        if (!res || !res.ok) return null;
        return (await res.json()) as NotificationListResponse;
    } catch (error) {
        console.error("[API] Error fetching notifications:", error);
        return null;
    }
}

export async function markAllNotificationsRead(): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/notifications/read-all", { method: "PATCH" });
        return !!res && res.ok;
    } catch (error) {
        console.error("[API] Error marking all read:", error);
        return false;
    }
}

export async function markNotificationRead(id: number): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/notifications/${id}/read`, { method: "PATCH" });
        return !!res && res.ok;
    } catch (error) {
        console.error(`[API] Error marking notif ${id} read:`, error);
        return false;
    }
}

export async function deleteNotification(id: number): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/notifications/${id}`, { method: "DELETE" });
        return !!res && res.ok;
    } catch (error) {
        console.error(`[API] Error deleting notif ${id}:`, error);
        return false;
    }
}

// ==========================================
// FRIENDS
// ==========================================

export async function getFriends(): Promise<FriendListResponse | null> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/friends");
        if (!res || !res.ok) return null;
        return (await res.json()) as FriendListResponse;
    } catch (error) {
        console.error("[API] Error fetching friends:", error);
        return null;
    }
}

export async function getFriendRequests(): Promise<FriendRequestsResponse | null> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/friends/requests");
        if (!res || !res.ok) return null;
        return (await res.json()) as FriendRequestsResponse;
    } catch (error) {
        console.error("[API] Error fetching friend requests:", error);
        return null;
    }
}

export async function sendFriendRequest(targetId: number): Promise<{ ok: boolean; message?: string }> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/friends/${targetId}`, { method: "POST" });
        if (!res) return { ok: false, message: "Connessione fallita" };
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        const msg = res.status === 400 ? "Non puoi aggiungerti da solo"
            : res.status === 404 ? "Utente non trovato"
            : res.status === 409 ? "Richiesta già inviata o già amici"
            : data.message || "Errore";
        return { ok: false, message: msg };
    } catch (error) {
        return { ok: false, message: "Network error" };
    }
}

export async function respondFriendRequest(targetId: number, action: 'ACCEPTED' | 'REJECTED'): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/friends/${targetId}/respond`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        return !!res && res.ok;
    } catch (error) {
        console.error("[API] Error responding to friend request:", error);
        return false;
    }
}

export async function removeFriend(targetId: number): Promise<boolean> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/friends/${targetId}`, { method: "DELETE" });
        return !!res && (res.ok || res.status === 204);
    } catch (error) {
        console.error("[API] Error removing friend:", error);
        return false;
    }
}

export async function sendGameInvite(targetId: number, expiresInSeconds = 60): Promise<{ ok: boolean; message?: string }> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/invites/${targetId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expiresInSeconds }),
        });
        if (!res) return { ok: false, message: "Connessione fallita" };
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        const msg = res.status === 409 ? "Invito già inviato" : data.message || "Errore";
        return { ok: false, message: msg };
    } catch (error) {
        return { ok: false, message: "Network error" };
    }
}

export async function getGameInvites(): Promise<GameInviteListResponse | null> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/invites");
        if (!res || !res.ok) return null;
        return (await res.json()) as GameInviteListResponse;
    } catch (error) {
        console.error("[API] Error fetching game invites:", error);
        return null;
    }
}

export async function respondGameInvite(inviteId: number, action: 'ACCEPTED' | 'REJECTED'): Promise<{ ok: boolean; sessionId?: string }> {
    try {
        const res = await fetchWithAuthRetry(`/api/users/me/invites/${inviteId}/respond`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        if (!res) return { ok: false };
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, sessionId: data.sessionId };
    } catch (error) {
        return { ok: false };
    }
}

export async function getMyAchievements(): Promise<UserAchievementsResponse | null> {
    try {
        const res = await fetchWithAuthRetry("/api/users/me/achievements");
        if (!res || !res.ok) return null;
        return (await res.json()) as UserAchievementsResponse;
    } catch (error) {
        console.error("[API] Error fetching achievements:", error);
        return null;
    }
}