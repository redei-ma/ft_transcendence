import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
	// creo l'app come applicazione Web standard , ovvero per il browser
	const app = await NestFactory.create(AppModule);

	app.enableShutdownHooks();

	const configService = app.get(ConfigService);

	// collego il Microservizio Redis
	app.connectMicroservice<MicroserviceOptions>({
		transport: Transport.REDIS,
		options: {
			host: configService.get<string>("REDIS_HOST"),
			port: configService.get<number>("REDIS_PORT"),
			retryAttempts: 10,
			retryDelay: 3000,
		},
	});

	// avvio microservizi e redis
	await app.startAllMicroservices();
	const port = configService.get<number>("PORT") ?? 3500;
	await app.listen(port, "0.0.0.0");
	console.log(
		`LOGIC SERVICE ONLINE: HTTP su porta ${port} e Redis collegato`,
	);
}
bootstrap();
