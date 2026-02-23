
import { Body, Controller, Post, Res, Req, UseGuards, Get, Query, BadRequestException} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import type { AuthenticatedRequest, } from '@game/auth-shared';
import {AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@game/auth-shared';
import { JwtRefreshGuard } from './jwt/jwt-refresh.guard';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './jwt/google.guard';
import { GoogleUser } from './types/google-user.type';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor (
    private readonly authService: AuthService,
    private readonly  config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() body: { username: string; email: string; password: string },
  ) {
    return await this.authService.registerAndSendVerification(
      body.username,
      body.email,
      body.password,
    );
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // avoid spam
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

/* @Post('login')
async login(@Body() body: { username: string; password: string; totp?: string }) {
  return this.authService.login(body.username, body.password, body.totp);
} */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: { username: string; password: string; totp?: string },
    @Res({ passthrough: true }) res: Response,
  ) {

    const result = await this.authService.login(
      body.username,
      body.password,
      body.totp,
    );

    if ('requires2fa' in result) {
      return result; // Returns { requires2fa: true } and stops here
    }

    const { accessToken, refreshToken, user } = result;

    res.cookie(AUTH_COOKIE_NAME || 'auth_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 15 * 60 * 1000
    });

    res.cookie(REFRESH_COOKIE_NAME || 'refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return user;
  }

  @Get('google')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // Redirects to Google
  }

  @Get('google/callback')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request & {user: GoogleUser}, @Res() res: Response) {


    if (!req.user) {
      return res.redirect(`${this.config.get('PUBLIC_URL')}/index.html?error=google_failed`);
    }
    const { accessToken, refreshToken } = await this.authService.loginWithGoogle(req.user);

    res.cookie(AUTH_COOKIE_NAME || 'auth_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    res.cookie(REFRESH_COOKIE_NAME || 'refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    return res.redirect(`${this.config.get('PUBLIC_URL')}/dashboard.html`);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {

      const accessToken = await this.authService.refresh( req.user );

      res.cookie(AUTH_COOKIE_NAME || 'auth_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });

    return { ok: true  };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
      await this.authService.logout(req.user.sub);

    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    return { ok: true };
  }

  @Get('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyEmail(@Query('token') token: string) {

    //console.log('RAW TOKEN:', token);
    if (!token) {
      throw new BadRequestException('Missing token');
    }

    const decodedToken = decodeURIComponent(token);
    //console.log('DECODED TOKEN:', decodedToken);

    await this.authService.verifyEmailToken(decodedToken);

    return {
      message: 'Email successfully verified. You can now log in.',
    };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.sendPasswordReset(body.email);
    return { ok: true };
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword( @Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { ok: true };
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  async setup2fa(@Req() req: AuthenticatedRequest) {
    return this.authService.setup2fa(req.user.sub);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enable2fa(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    await this.authService.enable2fa(req.user.sub, body.code);
    return { ok: true };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disable2fa(@Req() req: AuthenticatedRequest) {
    await this.authService.disable2fa(req.user.sub);
    return { ok: true };
  }
}
