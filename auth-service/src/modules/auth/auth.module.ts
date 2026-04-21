import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtRefreshStrategy } from './jwt/jwt-refresh.strategy';
import { MailService } from './mail/mail.service';
import { GoogleStrategy } from './jwt/google.strategy';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtRefreshStrategy,
    MailService,
    GoogleStrategy,
  ],
})
export class AuthModule {}
