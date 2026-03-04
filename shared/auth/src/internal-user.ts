export interface InternalUser {
  id: number;
  email: string;
  username: string;
  passwordHash?: string | null;
  emailVerified: boolean;
  tokenVersion: number;

  // OAuth
  provider?: string | null;
  oauthId?: string | null;

  // 2FA
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
}
