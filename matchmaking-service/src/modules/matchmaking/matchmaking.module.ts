import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MatchmakingController } from "./matchmaking.controller";
import { MatchmakingService } from "./matchmaking.service";
import { MatchmakingGateway } from "./matchmaking.gateway";
import { JwtAuthGuard } from "@transcendence/auth";

@Module({
	imports: [EventEmitterModule.forRoot()],
	controllers: [MatchmakingController],
	providers: [MatchmakingService, MatchmakingGateway, JwtAuthGuard],
})
export class MatchmakingModule {}
