import {
  Body,
  Controller,
  Logger,
  Post,
  Delete,
  Res,
  Req,
  UseGuards,
  Get,
  Query,
  Param,
  ParseEnumPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '@transcendence/auth';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME, JwtAuthGuard } from '@transcendence/auth';
import { JwtRefreshGuard } from './jwt/jwt-refresh.guard';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './jwt/google.guard';
import { CreateLocalUserNoHashDto, CreateOAuthUserDto } from '@transcendence/dto';
import { Provider } from '@transcendence/types';
import { ResetPasswordDto, ChangePasswordDto, EmailDto, NewEmailDto, LoginDto, Enable2FADto, TokenQueryDto, ConfirmPasswordDto } from '../../dto/input.dto';


@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() body: CreateLocalUserNoHashDto,
  ) {
    this.logger.log(`[HTTP] POST /register username=${body.username}`);
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
    this.logger.log(`[HTTP] POST /login identifier=${body.identifier}`);
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
    const { accessToken, refreshToken, wasLinked } =
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

    const redirectPath = wasLinked ? '/dashboard.html?linked=GOOGLE' : '/dashboard.html';
    return res.redirect(`${this.config.getOrThrow('PUBLIC_URL')}${redirectPath}`);
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
    this.logger.log(`[HTTP] POST /logout userId=${req.user.sub}`);
    await this.authService.logout(req.user.sub);

    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    return { ok: true };
  }

  @Get('verify-email')
  // TO RESTORE AT DELIVERY: delete the current implementation and uncomment the block below
  async verifyEmail(@Query() query: TokenQueryDto): Promise<{ ok: boolean; message: string }> {
    // -- TEMPORARY: returns plain JSON to avoid loading the full React app via ngrok --
    try {
      await this.authService.verifyEmailToken(decodeURIComponent(query.token));
      return { ok: true, message: 'Email verified successfully. You can now log in.' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verification failed.';
      return { ok: false, message: msg };
    }
  }
  // -- ORIGINAL (redirects to frontend EmailCallbackPage) --
  // async verifyEmail(@Query() query: TokenQueryDto, @Res() res: Response): Promise<void> {
  //   const frontendUrl = this.config.getOrThrow('PUBLIC_URL');
  //   try {
  //     await this.authService.verifyEmailToken(decodeURIComponent(query.token));
  //     res.redirect(`${frontendUrl}/?verified=success`);
  //   } catch (e: unknown) {
  //     const msg = e instanceof Error ? e.message : 'Verification failed.';
  //     res.redirect(`${frontendUrl}/?verified=error&msg=${encodeURIComponent(msg)}`);
  //   }
  // }

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
  // TO RESTORE AT DELIVERY: delete the current implementation and uncomment the block below
  async confirmEmailChange(@Query() query: TokenQueryDto): Promise<{ ok: boolean; message: string }> {
    // -- TEMPORARY: returns plain JSON to avoid loading the full React app via ngrok --
    try {
      await this.authService.confirmEmailChange(decodeURIComponent(query.token));
      return { ok: true, message: 'Email updated successfully.' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Email change failed.';
      return { ok: false, message: msg };
    }
  }
  // -- ORIGINAL (redirects to frontend EmailCallbackPage) --
  // async confirmEmailChange(@Query() query: TokenQueryDto, @Res() res: Response): Promise<void> {
  //   const frontendUrl = this.config.getOrThrow('PUBLIC_URL');
  //   try {
  //     await this.authService.confirmEmailChange(decodeURIComponent(query.token));
  //     res.redirect(`${frontendUrl}/?email-changed=success`);
  //   } catch (e: unknown) {
  //     const msg = e instanceof Error ? e.message : 'Email change failed.';
  //     res.redirect(`${frontendUrl}/?email-changed=error&msg=${encodeURIComponent(msg)}`);
  //   }
  // }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Body() body: ConfirmPasswordDto,
  ): Promise<void> {
    return this.authService.deleteAccount(req.user.sub, body);
  }

  @Delete('provider/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async unlinkProvider(
    @Req() req: AuthenticatedRequest,
    @Param('provider', new ParseEnumPipe(Provider)) provider: Provider,
  ): Promise<void> {
    return this.authService.unlinkProvider(req.user.sub, provider);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { requiresLogout } = await this.authService.changePassword(req.user.sub, body);

    if (requiresLogout) {
      res.clearCookie('auth_token');
      res.clearCookie('refresh_token');
    }

    return { message: 'Password updated successfully', requiresLogout };
  }
}
