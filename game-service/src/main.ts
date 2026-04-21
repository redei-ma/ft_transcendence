import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import { MsgpackIoAdapter } from "./socketMsg.adapter";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger:
			process.env.NODE_ENV === "production"
				? ["error", "warn", "log"]
				: ["error", "warn", "log", "debug", "verbose"],
	});
	app.enableShutdownHooks();

	const configService = app.get(ConfigService);

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	const config = new DocumentBuilder()
		.setTitle("Game Service API")
		.setDescription(
			"Internal API for match management, stats, and achievements.",
		)
		.setVersion("1.0")
		.addTag("Matches")
		.addTag("Achievements")
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api/docs", app, document);

	app.enableCors({
		origin: configService.get<string>("FRONTEND_URL"),
		credentials: true,
	});

	app.use(cookieParser());
	app.useWebSocketAdapter(new MsgpackIoAdapter(app));

	const port = configService.get<number>("PORT") ?? 3000;
	await app.listen(port, "0.0.0.0");
	new Logger("Bootstrap").log(`Game Service running on port ${port}`);
}

bootstrap();
