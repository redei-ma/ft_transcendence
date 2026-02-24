import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GameExceptionFilter } from './game/game.WsGameExceptionFilter';
//serve per poter leggere il .env
//import { ConfigService} from '@nestjs/config'

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: ['log', 'error', 'warn', 'debug', 'verbose'],
	});

	/* This decorator implements input validation.
	Setting 'whitelist: true' ensures that any property not explicitly defined in the DTO is automatically stripped. */
	app.useGlobalPipes(new ValidationPipe({
		whitelist: true,
		transform: true}));

	/*
    app.enableCors({
        origin: configService.get<string>('FRONTEND_URL'), // Es: 'https://www.clashofolympus.com'
        methods: ['GET', 'POST'],
        credentials: true, // Permette l'invio di cookie/token
    });
    */

	app.enableCors();
	//app.useGlobalFilters(new GameExceptionFilter());

	const logger: Logger = new Logger('Bootstrap');
	await app.listen(3000, "0.0.0.0");

	logger.log(`application running on port 3000`);
}

bootstrap();
