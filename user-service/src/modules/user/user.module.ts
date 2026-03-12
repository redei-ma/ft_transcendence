import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "@transcendence/auth";
import { PrismaModule } from "../prisma/prisma.module";

import { ProfileService } from "./services/profile.service";
import { AvatarService } from "./services/avatar.service";
import { MatchHistoryService } from "./services/match-history.service";
import { AchievementService } from "./services/achievement.service";
import { InternalUserService } from "./services/internal-user.service";
import { FriendshipService } from "./services/friendship.service";
import { NotificationService } from "./services/notification.service";
import { GameInviteService } from "./services/game-invite.service";

import { ProfileController } from "./controllers/profile.controller";
import { AvatarController } from "./controllers/avatar.controller";
import { MatchHistoryController } from "./controllers/match-history.controller";
import { AchievementController } from "./controllers/achievement.controller";
import { InternalUserController } from "./controllers/internal-user.controller";
import { FriendshipController } from "./controllers/friendship.controller";
import { NotificationController } from "./controllers/notification.controller";
import { GameInviteController } from "./controllers/game-invite.controller";

@Module({
	imports: [PrismaModule],
	controllers: [
		ProfileController,
		AvatarController,
		MatchHistoryController,
		AchievementController,
		InternalUserController,
		FriendshipController,
		NotificationController,
		GameInviteController,
	],
	providers: [
		ProfileService,
		AvatarService,
		MatchHistoryService,
		AchievementService,
		InternalUserService,
		FriendshipService,
		NotificationService,
		GameInviteService,
		JwtAuthGuard,
	],
	exports: [InternalUserService, NotificationService],
})
export class UserModule {}
