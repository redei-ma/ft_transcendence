import { Module } from '@nestjs/common';
import { UserClient } from './user.client';

@Module({
  providers: [UserClient],
  exports: [UserClient],
})
export class UserModule {}
