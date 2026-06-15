import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RedisModule } from "@nestjs-modules/ioredis";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { envValidationSchema } from "./env.validation";
import { HealthModule } from "./modules/health/health.module";
import { MatchmakingModule } from "./modules/matchmaking/matchmaking.module";

@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
		RedisModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
				type: "single",
				url: configService.get<string>("REDIS_URL"),
			}),
			inject: [ConfigService],
		}),
		HealthModule,
		MatchmakingModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
