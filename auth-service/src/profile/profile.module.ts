import { Module } from '@nestjs/common';
import { ProfileClient } from './profile.client';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ProfileClient]
})
export class ProfileModule {}
