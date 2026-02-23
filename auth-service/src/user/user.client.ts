import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
//import type { /* InternalUser  */ } from '@game/auth-shared';

@Injectable()
export class UserClient {
  constructor(private readonly http: HttpService) {}

  async findByUsername(username: string): Promise</* InternalUser  */ any | null> {
    const { data } = await this.http.axiosRef.get(
      `http://user-service/internal/users/${username}`,
    );
    return data;
  }

  async findByEmail(email: string): Promise</* InternalUser  */ any | null> {
    const { data } = await this.http.axiosRef.get(
      `http://user-service/internal/users/${email}`,
    );
    return data;
  }

  async findById(id: number): Promise</* InternalUser  */ any | null> {
    const { data } = await this.http.axiosRef.get(
      `http://user-service/internal/users/${id}`,
    );
    return data;
  }

  async createUser(
    username: string,
    email: string,
    passwordHash: string,
  ): Promise</* InternalUser  */ any > {
    const { data } = await this.http.axiosRef.post(
      `http://user-service/internal/users`,
      {
        username,
        email,
        passwordHash
      },
    );
    return data;
  }

  async createOAuthUser(
    email: string,
    username: string,
    oauthId: string,
    provider: string,
  ): Promise</* InternalUser  */ any > {
    const { data } = await this.http.axiosRef.post(
      `http://user-service/internal/users/oauth`,
      {
        email,
        username,
        oauthId,
        provider
      },
    );
    return data;
  }

  async invalidateRefreshTokens(userId: number): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service/internal/users/${userId}/token-version`,
    );
  }

  async markEmailVerified(userId: number): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service/internal/users/${userId}/verify-email`,
    );
  }

  async updatePassword(userId: number, hashed: string): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service/internal/users/${userId}/password/change`,
      { passwordHash: hashed },
    );
  }

  async findByProvider(provider: string, oauthId: string): Promise</* InternalUser  */ any | null> {
    const { data } = await this.http.axiosRef.get(
      `http://user-service/internal/users/${provider}/${oauthId}`,
    );
    return data;
  }

  async linkProvider(userId: number, provider: string, oauthId: string) {
    const { data } = await this.http.axiosRef.post(
      `http://user-service/internal/users/${userId}/oauth/${provider}`,
      { oauthId },
    );
    return data;
  }

  async setup2fa(userId: number, twoFactorSecret: string): Promise<void> {
    await this.http.axiosRef.post(
      `http://user-service/internal/users/${userId}/2fa/setup`,
      { twoFactorSecret },
    );
  }

  async enable2fa(userId: number): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service/internal/users/${userId}/2fa/enable`,
    );
  }

  async disable2fa(userId: number): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service/internal/users/${userId}/2fa/disable`,
    );
  }
}

/* @Injectable()
export class ProfileClient {
  async upsertProfile(dto: { userId: number; avatar?: string }) {
    await fetch("http://profile_service:3001/profile/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": process.env.INTERNAL_KEY!,
      },
      body: JSON.stringify(dto),
    });
  }
}
 */
