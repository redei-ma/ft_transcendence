import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "@transcendence/auth";
import { PrismaModule } from "../prisma/prisma.module";

import { UserService } from "./services/user.service";
import { MatchHistoryService } from "./services/match-history.service";
import { AchievementService } from "./services/achievement.service";
import { FriendshipService } from "./services/friendship.service";
import { NotificationService } from "./services/notification.service";
import { GameInviteService } from "./services/game-invite.service";

import { PublicUserController } from "./controllers/public-user.controller";
import { InternalUserController } from "./controllers/internal-user.controller";
import { FriendshipController } from "./controllers/friendship.controller";
import { NotificationController } from "./controllers/notification.controller";
import { GameInviteController } from "./controllers/game-invite.controller";

@Module({
	imports: [PrismaModule],
	controllers: [
		PublicUserController,
		InternalUserController,
		FriendshipController,
		NotificationController,
		GameInviteController,
	],
	providers: [
		UserService,
		MatchHistoryService,
		AchievementService,
		FriendshipService,
		NotificationService,
		GameInviteService,
		JwtAuthGuard,
	],
	exports: [UserService, NotificationService],
})
export class UserModule {}
