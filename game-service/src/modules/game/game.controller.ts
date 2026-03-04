import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@transcendence/auth';
import type { AuthenticatedRequest } from '@transcendence/auth';

@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return { user: req.user };
  }
}
