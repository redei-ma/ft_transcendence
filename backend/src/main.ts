import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NetworkConfig } from './game/configs/network.config';
import { WsGameException } from './game/WsGameException';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: ['log', 'error', 'warn', 'debug', 'verbose'],
	});

	app.enableCors();
	app.useGlobalFilters(new WsGameException());
	app.connectMicroservice<MicroserviceOptions>(
		{
			transport: Transport.REDIS,
			options:{
				host: NetworkConfig.MATCHMAKING.SERVICE.REDIS,
				port: 6379,
				retryAttempts: 10,
				retryDelay: 3000,
			}
		}
	)


	const logger: Logger = new Logger('Bootstrap');
	//await app.startAllMicroservices();
	await app.listen(3000, "0.0.0.0");

	logger.log(`application running on port 3000`);
}

bootstrap();
