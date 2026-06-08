/**
 * Auth service — basato sui prototipi di Ale (authFetch.js, socketAuth.js)
 * Gestisce: login, register, logout, refresh, forgot/reset password, 2FA, OAuth
 */

import { logger } from '../../configs/logger';

export class RateLimitError extends Error {
  constructor() { super('rate_limited'); }
}

export interface AuthResponseData {
  requires2fa?: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

export interface AuthResult {
  ok: boolean;
  data: AuthResponseData;
}

/** Converte qualsiasi errore del backend in una stringa leggibile */
export function toErrorString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object' && val !== null && 'message' in val) return toErrorString((val as any).message);
  return String(val);
}

export async function fetchWithAuthRetry(
  url: string,
  options: RequestInit = {},
): Promise<Response | null> {
  try {
    const fetchOptions: RequestInit = { // Parametri anti-cache: evitano che utenti diversi sullo stesso PC vedano i dati dell'altro.
      ...options,
      credentials: "include",
      cache: "no-store",  // Dice al browser di bypassare la cache locale
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...options.headers,
      }
    };

    let res = await fetch(url, fetchOptions);

    if (res.status === 429) throw new RateLimitError();

    if (res.status === 401) {
      const success = await refreshToken();
      if (!success) return null;

      res = await fetch(url, fetchOptions);
      if (res.status === 429) throw new RateLimitError();
    }

    return res;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    return null;
  }
}

export async function login(
  identifier: string,
  password: string,
  totp?: string,
): Promise<AuthResult> {
  const payload: Record<string, string> = { identifier, password };
  if (totp) payload.totp = totp;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (res.status === 429) return { ok: false, data: { error: 'rate_limited' } };
    return { ok: res.ok, data: await res.json() };
  } catch (error) {
    logger.error("AuthService", "Login error:", error);
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

    if (res.status === 429) return { ok: false, data: { error: 'rate_limited' } };
    return { ok: res.ok, data: await res.json() };
  } catch (error) {
    logger.error("AuthService", "Register error:", error);
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
    logger.error("AuthService", "Logout error:", error);
  }
}

export async function forgotPassword(email: string): Promise<'ok' | 'rate_limited' | 'error'> {
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) return 'rate_limited';
    return 'ok';
  } catch (error) {
    logger.error("AuthService", "Forgot password error:", error);
    return 'error';
  }
}

export function redirectToGoogle(): void {
  window.location.href = "/api/auth/google";
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const checkRes = await fetch("/api/auth/session-check");
      const { hasSession } = await checkRes.json();
      if (!hasSession) return false;

      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function resendVerification(email: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, message: toErrorString(data.message || data.error) };
  } catch (error) {
    return { ok: false, message: "Network error" };
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, message: toErrorString(data.message || data.error) };
  } catch (error) {
    return { ok: false, message: "Network error" };
  }
}