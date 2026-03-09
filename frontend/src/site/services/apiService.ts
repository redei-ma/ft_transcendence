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

// ==========================================
// 📡 CHIAMATE API
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

// --- 2FA SETUP ---

export async function generate2fa() {
  try {
    // ⚡ Aggiornato con la rotta esatta di Giovanni
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
    // ⚡ Aggiornato con la rotta esatta di Giovanni
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
    // ⚡ Aggiornato con la rotta esatta di Giovanni
    const res = await fetchWithAuthRetry("/api/auth/2fa/disable", { method: "POST" });
    return !!res && res.ok;
  } catch (error) {
    console.error("[API] Error turning off 2FA:", error);
    return false;
  }
}