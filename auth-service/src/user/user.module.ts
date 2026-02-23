import { Module } from '@nestjs/common';
import { UserClient } from './user.client';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [UserClient]
})
export class UserModule {}
