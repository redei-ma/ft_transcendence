import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { MatchResultModule } from "./modules/result/match-result.module";
import { AchievementModule } from "./modules/achievement/achievement.module";
import { HealthModule } from "./modules/health/health.module";
import { GameModule } from './modules/game/game.module';
import { envValidationSchema } from './env.validation';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env.shared",
			validationSchema: envValidationSchema,
		}),
		PrismaModule,
		MatchResultModule,
		AchievementModule,
		HealthModule,
		GameModule,
	],
})
export class AppModule {}
