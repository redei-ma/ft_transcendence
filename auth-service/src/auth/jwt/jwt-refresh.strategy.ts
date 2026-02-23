import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Injectable, UnauthorizedException} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshPayloadDto, REFRESH_COOKIE_NAME } from '@game/auth-shared';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor( private readonly usersService: UsersService, config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.[REFRESH_COOKIE_NAME],
      ]),
/*       jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          console.log('cookies', req?.cookies);
          return req?.cookies?.[REFRESH_COOKIE_NAME];
        },
      ]), */
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      ignoreExpiration: false,
    });
  }

async validate(payload: JwtRefreshPayloadDto) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    return {
      sub: user.id,
      username: user.username,
    };

  }
}