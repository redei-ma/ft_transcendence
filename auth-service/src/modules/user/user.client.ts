
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import {
  CreateLocalUserDto,
  CreateOAuthUserDto,
  UpdatePasswordDto,
  LinkOAuthDto,
  Setup2faDto,
  FindUserQueryDto,
  UserWithAccountsResponseDto,
  UpdateEmailDto,
  SetPasswordDto,
  UpdateStatusDto,
} from '@transcendence/dto';

@Injectable()
export class UserClient {
  private readonly baseUrl = 'http://user-service:3001/internal/users';

  // Helper to handle repetitive fetch logic
  private async request<T>(
    path: string,
    options: RequestInit = {},
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      Object.keys(params).forEach((key) =>
        url.searchParams.append(key, params[key].toString()),
      );
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 404) return null as T;

    if (!response.ok) {
      throw new HttpException(
        `UserClient Error: ${response.statusText}`,
        response.status,
      );
    }

    // For 204 No Content or empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return response.json();
  }

  async findUser(query: FindUserQueryDto): Promise<UserWithAccountsResponseDto | null> {
    return this.request<UserWithAccountsResponseDto>('', { method: 'GET' }, query);
  }

  async createUser(dto: CreateLocalUserDto): Promise<UserWithAccountsResponseDto> {
    return this.request<UserWithAccountsResponseDto>('', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async createOAuthUser(dto: CreateOAuthUserDto): Promise<UserWithAccountsResponseDto> {
    return this.request<UserWithAccountsResponseDto>('/oauth', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async invalidateRefreshTokens(userId: number): Promise<number> {
    const data = await this.request<{ tokenVersion: number }>(`/${userId}/token-version`, { method: 'PATCH' });
    return data.tokenVersion;
  }

  async markEmailVerified(userId: number): Promise<void> {
    await this.request(`/${userId}/verify-email`, { method: 'PATCH' });
  }

  async updatePassword(userId: number, dto: UpdatePasswordDto): Promise<void> {
    await this.request(`/${userId}/password/change`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async findByProvider(provider: string, oauthId: string): Promise<UserWithAccountsResponseDto | null> {
    return this.request<UserWithAccountsResponseDto>(`/${provider}/${oauthId}`, { method: 'GET' });
  }

  async linkProvider(userId: number, provider: string, dto: LinkOAuthDto): Promise<void> {
    await this.request(`/${userId}/oauth/${provider}`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async setup2fa(userId: number, dto: Setup2faDto): Promise<void> {
    await this.request(`/${userId}/2fa/setup`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async enable2fa(userId: number): Promise<void> {
    await this.request(`/${userId}/2fa/enable`, { method: 'PATCH' });
  }

  async disable2fa(userId: number): Promise<void> {
    await this.request(`/${userId}/2fa/disable`, { method: 'DELETE' });
  }

  async updateEmail(userId: number, dto: UpdateEmailDto): Promise<void> {
    await this.request(`/${userId}/email`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async setPassword(userId: number, dto: SetPasswordDto): Promise<void> {
    await this.request(`/${userId}/password/set`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateStatus(userId: number, dto: UpdateStatusDto): Promise<void> {
    await this.request(`/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async unlinkOAuth(userId: number, provider: string): Promise<void> {
    await this.request(`/${userId}/oauth/${provider}`, { method: 'DELETE' });
  }

  async deleteUser(userId: number): Promise<void> {
    await this.request(`/${userId}`, { method: 'DELETE' });
  }

  async getGdprData(userId: number): Promise<any> {
    return this.request<any>(`/${userId}/gdpr-data`, { method: 'GET' });
  }
}
