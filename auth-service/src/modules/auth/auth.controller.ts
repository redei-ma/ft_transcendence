import {
  Body,
  Controller,
  Post,
  Delete,
  Res,
  Req,
  UseGuards,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Param
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '@transcendence/auth';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME, JwtAuthGuard } from '@transcendence/auth';
import { JwtRefreshGuard } from './jwt/jwt-refresh.guard';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './jwt/google.guard';
import { CreateLocalUserNoHashDto, CreateOAuthUserDto } from '@transcendence/dto';
import { ResetPasswordDto, ChangePasswordDto, EmailDto, NewEmailDto, LoginDto, Enable2FADto, TokenQueryDto, ConfirmPasswordDto } from '../../dto/input.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) { }

  @Post('register')
  async register(
    @Body() body: CreateLocalUserNoHashDto,
  ) {
    return await this.authService.registerAndSendVerification(body);
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: EmailDto) {
    return this.authService.resendVerificationEmail(body);
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body);

    if ('requires2fa' in result) {
      return result;
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

  @Get('session-check')
  async sessionCheck(@Req() req: Request) {
    // Check if the refresh cookie exists in the request
    const hasRefreshToken = !!req.cookies?.[REFRESH_COOKIE_NAME || 'refresh_token'];

    // We return 200 OK even if false, so the console stays clean!
    return { hasSession: hasRefreshToken };
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
  async verifyEmail(
    @Query() query: TokenQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.config.getOrThrow('PUBLIC_URL');
    try {
      await this.authService.verifyEmailToken(decodeURIComponent(query.token));
      res.redirect(`${frontendUrl}/?verified=success`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verification failed.';
      res.redirect(`${frontendUrl}/?verified=error&msg=${encodeURIComponent(msg)}`);
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: EmailDto) {
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
    @Body() body: Enable2FADto,
  ) {
    await this.authService.enable2fa(req.user.sub, body);
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
  async confirmEmailChange(
    @Query() query: TokenQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.config.getOrThrow('PUBLIC_URL');
    try {
      await this.authService.confirmEmailChange(decodeURIComponent(query.token));
      res.redirect(`${frontendUrl}/?email-changed=success`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Email change failed.';
      res.redirect(`${frontendUrl}/?email-changed=error&msg=${encodeURIComponent(msg)}`);
    }
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Body() body: ConfirmPasswordDto,
  ) {
    await this.authService.deleteAccount(req.user.sub, body);
    return { ok: true, message: 'Account deletion confirmation email sent.' };
  }

  @Post('gdpr/export-request')
  @UseGuards(JwtAuthGuard)
  async requestGdprExport(
    @Req() req: AuthenticatedRequest,
    @Body() body: ConfirmPasswordDto,
  ) {
    await this.authService.requestGdprExport(req.user.sub, body);
    return { ok: true, message: 'GDPR export confirmation email sent.' };
  }

  @Get('gdpr/export')
  async exportGdprData(
    @Query() query: TokenQueryDto,
    @Res() res: Response,
  ) {
    try {
      const { zipBuffer, username } = await this.authService.getGdprExportZip(query.token);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="transcendence_gdpr_export_${username}.zip"`);
      return res.status(HttpStatus.OK).send(zipBuffer);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Export failed.';
      const frontendUrl = this.config.getOrThrow('PUBLIC_URL');
      return res.redirect(`${frontendUrl}/?gdpr-export=error&msg=${encodeURIComponent(msg)}`);
    }
  }

  @Get('gdpr/export-try/:id')
  async exportGdprDataTry(
/*     @Query() query: TokenQueryDto,
    @Res() res: Response, */
    @Param("id", ParseIntPipe) id: number,
  ) {
    try {
      //const { zipBuffer, username } = await this.authService.getGdprExportZip(query.token);
      return await this.authService.getGdprExportZipTry(id);
      //res.setHeader('Content-Type', 'application/zip');
      //res.setHeader('Content-Disposition', `attachment; filename="transcendence_gdpr_export_${username}.zip"`);
      //return res.status(HttpStatus.OK).send(zipBuffer);
    } catch (error: any) {
/*       const msg = e instanceof Error ? e.message : 'Export failed.';
      const frontendUrl = this.config.getOrThrow('PUBLIC_URL');
      return res.redirect(`${frontendUrl}/?gdpr-export=error&msg=${encodeURIComponent(msg)}`); */
        console.error('[GDPR DEBUG] ERRORR user.client communication failed:', {
        message: error.message,
        response: error.response?.data || error.response || 'No response body',
        status: error.response?.status
      });
      throw error;
    }
  }

  @Get('gdpr/delete-confirm')
  async confirmDeleteAccount(
    @Query() query: TokenQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.config.getOrThrow('PUBLIC_URL');
    try {
      await this.authService.confirmDeleteAccount(decodeURIComponent(query.token));
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      res.redirect(`${frontendUrl}/?delete-account=success`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Account deletion failed.';
      res.redirect(`${frontendUrl}/?delete-account=error&msg=${encodeURIComponent(msg)}`);
    }
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
