import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './auth/jwt/jwt.guard';
import type { AuthenticatedRequest } from '@game/auth-shared';

@Controller()
export class AppController {
  @Get()
  getCookies(@Req() req: Request) {
    return {
      cookies: req.cookies,
      signedCookies: req.signedCookies,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtected(@Req() req: AuthenticatedRequest) {
    return {
      msg: 'You are authenticated!',
      user: req.user,
    };
  }
}
