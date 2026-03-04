// primo pezzo che viene caricato di codice, qui importiamo tutte le cose di cui abbiamo bisogno per far si che il nostro codice funzioni correttamente

import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config'; // modulo per gestire le variabili d'ambiente (.env)
import { MatchmakingModule } from './matchmaking/matchmaking.module';

@Module({ // andiamo a definire il modulo principale dell'applicazione
  imports: [ 
    // carichiamo il ConfigModule per permettere a Docker di passarci l'indirizzo di Redis
    ConfigModule.forRoot({
      isGlobal: true, // lo rendiamo disponibile in tutta l'app senza doverlo reimportare
    }),

    // qui andiamo a creare la connessione con il database redis in modo asincrono
    // usiamo forRootAsync perché dobbiamo aspettare che il ConfigService legga l'URL dal file .env
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        // leggiamo l'url dal .env (es. redis://redis:6379), se non c'è usiamo il localhost come ruota di scorta
        url: configService.get<string>('REDIS_URL') || 'redis://redis:6379',
      }),
      inject: [ConfigService],
    }),

    MatchmakingModule, // andiamo a richiamare il modulo corretto per quello che deve essere fatto
  ],
  // controllers e providers vuoti perché tutto è gestito nei moduli specifici
  controllers: [],
  providers: [],
})
export class AppModule {} // diamo la possibilità al main di usare questo modulo