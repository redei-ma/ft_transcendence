import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';

@Module({
  imports: [
    // Permette al Service di emettere l'evento 'match.found.internal'
    EventEmitterModule.forRoot(), 
    // Permette al Service di fare chiamate HTTP verso il server di Giovanni
    HttpModule, 
  ],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingService, 
    // Questo è il "motore" che permette a Francesco di connettersi via Socket.io
    MatchmakingGateway 
  ],
})
export class MatchmakingModule {}