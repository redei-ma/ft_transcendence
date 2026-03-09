/**
 * Auth service — basato sui prototipi di Ale (authFetch.js, socketAuth.js)
 * Gestisce: login, register, logout, refresh, forgot/reset password, 2FA, OAuth
 */

export interface AuthResponseData {
	requires2fa?: boolean;
	message?: string;
	error?: string;
	[key: string]: any; // Permette qualsiasi altra chiave che il backend potrebbe inviare
}

export interface AuthResult {
	ok: boolean;
	data: AuthResponseData;
}

export async function fetchWithAuthRetry(
	url: string,
	options: RequestInit = {},
): Promise<Response | null> {
	try {
		let res = await fetch(url, { ...options, credentials: "include" });

		if (res.status === 401) {
			const refreshed = await fetch("/api/auth/refresh", {
				method: "POST",
				credentials: "include",
			});

			if (!refreshed.ok) {
				return null; // caller should redirect to login
			}
			res = await fetch(url, { ...options, credentials: "include" });
		}

		return res;
	} catch (error) {
		console.error("[Auth] Fetch error:", error);
		return null;
	}
	}
	
	export async function login(
		username: string,
		password: string,
		totp?: string,
	): Promise<AuthResult> {
		const payload: Record<string, string> = { username, password };
		if (totp) payload.totp = totp;
	
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
			});
		
			return { ok: res.ok, data: await res.json() };
		} catch (error) {
			console.error("[Auth] Login error:", error);
			return { ok: false, data: { error: "Network error" } };
		}
	}

export async function register(
	username: string,
	email: string,
	password: string,
): Promise<AuthResult> {
	try {
		const res = await fetch("/api/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ username, email, password }),
		});

		return { ok: res.ok, data: await res.json() };
	} catch (error) {1
		console.error("[Auth] Register error:", error);
		return { ok: false, data: { error: "Network error" } };
	}
}

export async function logout(): Promise<void> {
	try {
		await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "include",
		});
	} catch (error) {
		console.error("[Auth] Logout error:", error);
	}
}

export async function forgotPassword(email: string): Promise<boolean> {
	try {
		const res = await fetch("/api/auth/forgot-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		return res.ok;
	} catch (error) {
		console.error("[Auth] Forgot password error:", error);
		return false;
	}
}

export function redirectToGoogle(): void {
	window.location.href = "/api/auth/google";
}

export async function refreshToken(): Promise<boolean> {
	try {
		const res = await fetch("/api/auth/refresh", {
			method: "POST",
			credentials: "include",
		});
		if (!res.ok) {
			console.warn("❌ Refresh failed");
			return false;
		}
		console.log("🔄 Token refreshed");
		return true;
	} catch (error) {
		console.error("Refresh error:", error);
		return false;
	}
}

export async function verify2fa(code: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Vitale per farsi riconoscere dal backend!
      body: JSON.stringify({ code }),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch (error) {
    console.error('[Auth] Verify 2FA error:', error);
    return { ok: false, data: { error: "Network error" } };
  }
}