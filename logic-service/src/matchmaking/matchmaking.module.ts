// classic import per poter usare i file in un modulo separato

import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';

@Module({ // definiamo il modulo di matchmaking
  imports: [
    // Il ClientsModule vive qui perché serve solo al Matchmaking
    ClientsModule.register([ // qui andiamo a creare il client per parlare con renna e ricevere i dati di cui abbiamo bisogno
      {
        name: 'RENATO_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: 'redis',
          port: 6379,
        },
      },
    ]),
  ],
  controllers: [MatchmakingController], // controller associato al modulo
  providers: [MatchmakingService], // service associato al modulo
})
export class MatchmakingModule {}