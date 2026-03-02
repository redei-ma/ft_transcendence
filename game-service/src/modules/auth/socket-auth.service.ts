import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtAccessPayloadDto, isJwtAccessPayloadDto, AUTH_COOKIE_NAME } from "@game/auth-shared";

export function extractJwtFromCookie( cookieHeader?: string ): string | null {
  if (!cookieHeader) return null;

  const cookieName = AUTH_COOKIE_NAME || 'auth_token';

  const cookies = cookieHeader.split(";").map(c => c.trim());
  const jwtCookie = cookies.find(c => c.startsWith(`${cookieName}=`));

  if (!jwtCookie) return null;

  return jwtCookie.split("=")[1];
}

@Injectable()
export class SocketAuthService {
  constructor(private readonly config: ConfigService) {}

  verifyAccessToken(token: string): JwtAccessPayloadDto {
    const decoded = jwt.verify(
      token,
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    );

    if (!isJwtAccessPayloadDto(decoded)) {
      throw new Error('Invalid JWT payload shape');
    }

    return decoded;
  }
}
