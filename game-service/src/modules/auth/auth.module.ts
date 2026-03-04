import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '@transcendence/auth';

@Module({
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
