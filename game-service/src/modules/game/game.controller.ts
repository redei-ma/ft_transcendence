import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, AuthenticatedRequest } from "@transcendence/auth";

@Controller("api/game")
@UseGuards(JwtAuthGuard)
export class GameController {
	@Get("me")
	getMe(@Req() req: AuthenticatedRequest) {
		return { user: req.user };
	}
}
