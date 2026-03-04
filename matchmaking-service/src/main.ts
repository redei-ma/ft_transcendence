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
  // creo l'app come applicazione Web standard , ovvero per il browser
  const app = await NestFactory.create(AppModule);

  // collego il Microservizio Redis
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: 'redis', // per parlare con il container bisogna che si chiami 'redis'
      port: 6379,
      retryAttempts: 10,
      retryDelay: 3000,
    },
  });

  // avvio microservizi e redis
  await app.startAllMicroservices();
  await app.listen(3500, '0.0.0.0'); // porta interna al container
  console.log('LOGIC SERVICE ONLINE: HTTP su porta 3500 e Redis collegato');
}
bootstrap();