import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Guard for internal service-to-service HTTP endpoints.
 * Validates the Authorization header against INTERNAL_SERVICE_SECRET.
 *
 * Usage on controller or route:
 *   @UseGuards(InternalGuard)
 *   @Get('some-internal-route')
 *   handler() { ... }
 */
@Injectable()
export class InternalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    if (!secret) throw new UnauthorizedException('Internal secret not configured');

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || authHeader !== secret) {
      throw new UnauthorizedException('Invalid internal service secret');
    }
    return true;
  }
}
