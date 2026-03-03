import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  CreateLocalUserDto,
  CreateOAuthUserDto,
  UpdatePasswordDto,
  LinkOAuthDto,
  Setup2faDto,
  FindUserQueryDto,
  UserWithAccountsResponseDto,
} from '@transcendence/types';

@Injectable()
export class UserClient {
  constructor(private readonly http: HttpService) {}

  async findUser(
    query: FindUserQueryDto,
  ): Promise<UserWithAccountsResponseDto | null> {
    try {
      const { data } =
        await this.http.axiosRef.get<UserWithAccountsResponseDto>(
          'http://user-service:3001/internal/users',
          { params: query },
        );
      return data;
    } catch (e) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  }

  async createUser(
    dto: CreateLocalUserDto,
  ): Promise<UserWithAccountsResponseDto> {
    const { data } = await this.http.axiosRef.post<UserWithAccountsResponseDto>(
      `http://user-service:3001/internal/users`,
      dto,
    );
    return data;
  }

  async createOAuthUser(
    dto: CreateOAuthUserDto,
  ): Promise<UserWithAccountsResponseDto> {
    const { data } = await this.http.axiosRef.post<UserWithAccountsResponseDto>(
      `http://user-service:3001/internal/users/oauth`,
      dto,
    );
    return data;
  }

  async invalidateRefreshTokens(userId: number): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service:3001/internal/users/${userId}/token-version`,
    );
  }

  async markEmailVerified(userId: number): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service:3001/internal/users/${userId}/verify-email`,
    );
  }

  async updatePassword(userId: number, dto: UpdatePasswordDto): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service:3001/internal/users/${userId}/password/change`,
      dto,
    );
  }

  async findByProvider(
    provider: string,
    oauthId: string,
  ): Promise<UserWithAccountsResponseDto | null> {
    try {
      const { data } =
        await this.http.axiosRef.get<UserWithAccountsResponseDto>(
          `http://user-service:3001/internal/users/${provider}/${oauthId}`,
        );
      return data;
    } catch (e) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  }

  async linkProvider(
    userId: number,
    provider: string,
    dto: LinkOAuthDto,
  ): Promise<void> {
    await this.http.axiosRef.post(
      `http://user-service:3001/internal/users/${userId}/oauth/${provider}`,
      dto,
    );
  }

  async setup2fa(userId: number, dto: Setup2faDto): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service:3001/internal/users/${userId}/2fa/setup`,
      dto,
    );
  }

  async enable2fa(userId: number): Promise<void> {
    await this.http.axiosRef.patch(
      `http://user-service:3001/internal/users/${userId}/2fa/enable`,
    );
  }

  async disable2fa(userId: number): Promise<void> {
    await this.http.axiosRef.delete(
      `http://user-service:3001/internal/users/${userId}/2fa/disable`,
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
