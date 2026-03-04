import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Socket } from 'socket.io';
import type { AuthenticatedRequest } from './auth-request.type';
import * as jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from './constants';
import type { JwtAccessPayloadDto } from './jwt-access-payload.dto';
import { parseCookieHeader } from './cookie.utils';

/**
 * Verifies a JWT access token string and returns the decoded payload.
 * Reads JWT_ACCESS_SECRET from process.env.
 * Exported so gateways can use it directly in handleConnection.
 */
export function verifyJwtToken(token: string): JwtAccessPayloadDto {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new UnauthorizedException('JWT secret not configured');
  try {
    return jwt.verify(token, secret) as unknown as JwtAccessPayloadDto;
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }
}

/**
 * NestJS guard that validates the JWT access token for HTTP and WebSocket contexts.
 *
 * HTTP: reads auth_token cookie → verifies JWT → sets request.user = { sub, username }
 * WS:   verifies that socket.data.user was already set by handleConnection
 *
 * Usage in controllers:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('me')
 *   getMe(@Req() req: AuthenticatedRequest) { return req.user.sub; }
 *
 * Usage in gateways for individual events:
 *   @UseGuards(JwtAuthGuard)
 *   @SubscribeMessage('move')
 *   handleMove(client: Socket) { return client.data.user.sub; }
 *
 * For gateway handleConnection, use parseCookieHeader + verifyJwtToken directly.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const type = context.getType<'http' | 'ws'>();
    if (type === 'http') return this.validateHttp(context);
    if (type === 'ws') return this.validateWs(context);
    throw new UnauthorizedException('Unsupported context type');
  }

  private validateHttp(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, string>;
    const token = cookies?.[AUTH_COOKIE_NAME];
    if (!token) throw new UnauthorizedException('Missing auth token');
    request.user = verifyJwtToken(token);
    return true;
  }

  private validateWs(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    if (!client.data?.user) throw new UnauthorizedException('Not authenticated');
    return true;
  }
}
