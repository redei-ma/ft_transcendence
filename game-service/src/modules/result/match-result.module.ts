import { Module } from "@nestjs/common";
import { MatchResultService } from "./match-result.service";
import { UserNotificationClient } from "./user-notification.client";
import { PrismaModule } from "../prisma/prisma.module";
import { AchievementModule } from "../achievement/achievement.module";

@Module({
	imports: [PrismaModule, AchievementModule],
	providers: [MatchResultService, UserNotificationClient],
	exports: [MatchResultService],
})
export class MatchResultModule {}
