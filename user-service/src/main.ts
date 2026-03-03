import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Enable graceful shutdown
	app.enableShutdownHooks();

	// Global validation: rejects any request that doesn't match DTO rules
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // Strips properties not in the DTO
			forbidNonWhitelisted: true, // Throws if unknown properties are sent
			transform: true, // Auto-transforms payloads to DTO instances
		}),
	);

	// Swagger documentation
	const config = new DocumentBuilder()
		.setTitle("User Service API")
		.setDescription(
			"Internal API for user management. " +
				"Handles user CRUD, accounts (LOCAL/OAuth), 2FA, and profile updates. " +
				"All endpoints are under /internal/users and meant to be called " +
				"by other microservices, not directly by the frontend.",
		)
		.setVersion("1.0")
		.addTag("Users", "User management endpoints")
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api/docs", app, document);

	const port = process.env.PORT || 3001;
	await app.listen(port);
}

bootstrap();
