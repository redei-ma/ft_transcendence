import { Module } from "@nestjs/common";
import { RedisModule } from "@nestjs-modules/ioredis";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { HealthModule } from "./modules/health/health.module";
import { MatchmakingModule } from "./modules/matchmaking/matchmaking.module";
import { envValidationSchema } from "./env.validation";

@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
		RedisModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
				type: "single",
				url: `redis://${configService.get<string>("REDIS_HOST")}:${configService.get<number>("REDIS_PORT")}`,
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
