import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { MatchResultModule } from "./modules/result/match-result.module";
import { AchievementModule } from "./modules/achievement/achievement.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
		}),
		PrismaModule,
		MatchResultModule,
		AchievementModule,
		HealthModule,
	],
})
export class AppModule {}
