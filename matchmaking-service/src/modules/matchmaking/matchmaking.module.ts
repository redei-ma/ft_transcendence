import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    HttpModule,
  ],
  controllers: [MatchmakingController],
  providers: [MatchmakingService, MatchmakingGateway],
})
export class MatchmakingModule {}
