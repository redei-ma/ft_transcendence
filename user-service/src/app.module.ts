import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { envValidationSchema } from "./env.validation";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { UserModule } from "./modules/user/user.module";
import { HealthModule } from "./modules/health/health.module";
import { CleanupModule } from "./modules/cleanup/cleanup.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validationSchema: envValidationSchema,
		}),
		ScheduleModule.forRoot(),
		EventEmitterModule.forRoot(),
		PrismaModule,
		UserModule,
		HealthModule,
		CleanupModule,
	],
	providers: [],
})
export class AppModule {}
