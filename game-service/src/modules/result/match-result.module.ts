import { Module } from "@nestjs/common";
import { MatchResultService } from "./match-result.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AchievementModule } from "../achievement/achievement.module";
import { UserModule } from "../user/user.module";

@Module({
	imports: [PrismaModule, AchievementModule, UserModule],
	providers: [MatchResultService],
	exports: [MatchResultService],
})
export class MatchResultModule {}
