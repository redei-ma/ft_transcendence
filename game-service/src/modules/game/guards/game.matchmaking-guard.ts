import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@transcendence/types';

@Injectable()
export class MatchmakingGuard implements CanActivate {
  private readonly logger = new Logger(MatchmakingGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    const secretKey = this.configService.get<string>('INTERNAL_SERVICE_SECRET');

    if (!authHeader || authHeader !== secretKey) {
      this.logger.warn(`Unothorized connection reached with ip: ${request.ip}`);
      throw new UnauthorizedException({
        errorCode: ErrorCode.UNAUTHORIZED,
        message: 'Secret key failure, disconnecting',
      });
    }
    return true;
  }
}