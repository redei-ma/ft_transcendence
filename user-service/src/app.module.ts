import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { UserModule } from "./modules/user/user.module";
import { HealthController } from "./modules/health/health.controller";
import { HealthModule } from "./modules/health/health.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true, // Makes .env available everywhere
			envFilePath: ".env",
		}),
		PrismaModule,
		UserModule,
		HealthModule,
	],
})
export class AppModule {}
