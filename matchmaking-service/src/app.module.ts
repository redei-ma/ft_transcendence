import { Module } from "@nestjs/common";
import { RedisModule } from "@nestjs-modules/ioredis";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { HealthModule } from "./modules/health/health.module";
import { MatchmakingModule } from "./modules/matchmaking/matchmaking.module";

@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({ isGlobal: true }),
		RedisModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
				type: "single",
				url:
					configService.get<string>("REDIS_URL") ||
					"redis://redis:6379",
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
