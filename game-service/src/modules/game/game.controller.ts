import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import type { AuthenticatedRequest } from '@game/auth-shared';

@Controller("game")
@UseGuards(JwtAuthGuard)
export class GameController {
  @Get("me")
  getMe(@Req() req: AuthenticatedRequest) {
    return { user: req.user };
  }
}
