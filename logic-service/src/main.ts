/* import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Configuriamo il servizio per "ascoltare" i messaggi su Redis
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.REDIS,
    options: {
      host: 'localhost', // Il Redis che abbiamo appena acceso con Docker
      port: 6379,
    },
  });
  
  await app.listen();
  console.log('CONNESSO A REDIS: Logic Service in attesa di giocatori...');
}
bootstrap(); */

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1. Creiamo l'app come applicazione Web standard (per il browser)
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // 2. Colleghiamo il Microservizio Redis (per i messaggi)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: 'redis', // DEVE essere 'redis' per parlare con il container
      port: 6379,
      retryAttempts: 10,
      retryDelay: 3000,
    },
  });

  // Avviamo entrambi
  await app.startAllMicroservices();
  await app.listen(3001, '0.0.0.0'); // Porta interna al container
  console.log('LOGIC SERVICE ONLINE: HTTP su porta 3001 (esterna) e Redis collegato');
}
bootstrap();