import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { ProfileModule } from './profile/profile.module';

import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
      ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      }),
      ThrottlerModule.forRoot([
        {
          ttl: 60_000,   // 1 minute window
          limit: 10,     // default limit
        },
      ]), AuthModule, UsersModule, ProfileModule],
  controllers: [AppController],
})
export class AppModule {}

