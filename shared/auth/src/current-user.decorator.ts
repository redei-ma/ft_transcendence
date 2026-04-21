import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtAccessPayloadDto } from './jwt-access-payload.dto';

/**
 * Extracts a field (or the full payload) from the JWT user set by JwtAuthGuard.
 *
 * HTTP: reads from request.user (set by JwtAuthGuard.validateHttp)
 * WS:   reads from socket.data.user (set by gateway handleConnection)
 *
 * Available fields: sub (number, userID), username (string)
 *
 * Usage:
 *   @CurrentUser('sub') userId: number
 *   @CurrentUser() user: JwtAccessPayloadDto
 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtAccessPayloadDto | undefined, ctx: ExecutionContext): unknown => {
    const type = ctx.getType<'http' | 'ws'>();
    const user: JwtAccessPayloadDto =
      type === 'ws'
        ? ctx.switchToWs().getClient<{ data: { user: JwtAccessPayloadDto } }>().data.user
        : ctx.switchToHttp().getRequest<{ user: JwtAccessPayloadDto }>().user;
    return field ? user?.[field] : user;
  },
);
