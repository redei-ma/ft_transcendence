import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  UseGuards,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '@transcendence/auth';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME, JwtAuthGuard } from '@transcendence/auth';
import { JwtRefreshGuard } from './jwt/jwt-refresh.guard';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './jwt/google.guard';
import { CreateLocalUserNoHashDto, CreateOAuthUserDto } from '@transcendence/dto';
import { ResetPasswordDto, ChangePasswordDto, EmailDto, NewEmailDto } from '../../dto/input.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() body: CreateLocalUserNoHashDto,
  ) {
    return await this.authService.registerAndSendVerification( body );
  }

  @Post('resend-verification')
  async resendVerification(@Body('email') body: EmailDto) {
    return this.authService.resendVerificationEmail(body);
  }

  @Post('login')
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
      maxAge: 15 * 60 * 1000,
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
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // Redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: CreateOAuthUserDto },
    @Res() res: Response,
  ) {
    if (!req.user) {
      return res.redirect(
        `${this.config.getOrThrow('PUBLIC_URL')}/index.html?error=google_failed`,
      );
    }
    const { accessToken, refreshToken } =
      await this.authService.loginWithGoogle(req.user);

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

    return res.redirect(`${this.config.getOrThrow('PUBLIC_URL')}/dashboard.html`);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = await this.authService.refresh(req.user);

    res.cookie(AUTH_COOKIE_NAME || 'auth_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    return { ok: true };
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
  async forgotPassword(@Body() body: EmailDto ) {
    await this.authService.sendPasswordReset({ email: body.email });
    return { ok: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body);
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

  @UseGuards(JwtAuthGuard)
  @Post('change-email-request')
  async requestEmailChange(
    @Req() req: AuthenticatedRequest,
    @Body() body: NewEmailDto
  ) {
    return this.authService.requestEmailChange(req.user.sub, body);
  }

  @Get('confirm-email-change')
  async confirmEmailChange(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Token missing');
    return this.authService.confirmEmailChange(decodeURIComponent(token));
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.changePassword(req.user.sub, body);

    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    return { message: 'Password updated successfully' };
  }
}
