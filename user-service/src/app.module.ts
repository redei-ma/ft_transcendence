import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { envValidationSchema } from "./env.validation";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { UserModule } from "./modules/user/user.module";
import { HealthModule } from "./modules/health/health.module";
import { CleanupModule } from "./modules/cleanup/cleanup.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env.shared",
			validationSchema: envValidationSchema,
		}),
		ScheduleModule.forRoot(),
		ThrottlerModule.forRoot([
			{
				name: "global",
				ttl: 60_000,
				limit: 120,
			},
		]),
		PrismaModule,
		UserModule,
		HealthModule,
		CleanupModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
	],
})
export class AppModule {}
