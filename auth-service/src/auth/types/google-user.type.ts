// auth/types/google-user.type.ts
export interface GoogleUser {
  provider: 'google';
  oauthId: string;
  email: string;
  username: string;
}
