import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt/jwt.strategy';
import { UsersModule } from 'src/users/users.module';
import { JwtRefreshStrategy } from './jwt/jwt-refresh.strategy';
import { MailService } from './mail/mail.service';
import { GoogleStrategy } from './jwt/google.strategy';
import { ProfileModule } from 'src/profile/profile.module';
import { ProfileClient } from 'src/profile/profile.client';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    ProfileModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, MailService, GoogleStrategy, ProfileClient,
    {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
  ]
})
export class AuthModule {}
