import { Module } from "@nestjs/common";
import { AchievementService } from "./achievement.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
	imports: [PrismaModule],
	providers: [AchievementService],
	exports: [AchievementService],
})
export class AchievementModule {}
