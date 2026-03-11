import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JwtAccessPayloadDto, JwtRefreshPayloadDto } from '@transcendence/auth';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail/mail.service';
import { UserClient } from '../user/user.client';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import type { CreateOAuthUserDto } from '@transcendence/dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private usersService: UserClient,
  ) {}

  async registerAndSendVerification(
    username: string,
    email: string,
    password: string,
  ) {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!password || password.length < 10) {
      throw new BadRequestException(
        'Password must be at least 8 characters long.',
      );
    }

    if (!passwordRegex.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      );
    }
    /*     try { */

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser({
      username,
      email,
      passwordHash,
    });

    const token = this.generateEmailVerificationToken(user.id);

    const verifyUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.mailService.sendVerifyEmail(user.email, verifyUrl);

    return {
      message: `Welcome ${user.username}! Please check your email.`,
      user: { username: user.username, email: user.email },
    };

    /*   } catch (error) {
      console.error('[AUTH] ERRORE CRITICO NELLA REGISTRAZIONE:', error.message);
      if (error.response) {
        console.error('[AUTH] Dettagli errore User-Service:', error.response.data);
      }
      throw error.message;
    } */
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findUser({ email });

    if (!user) {
      // Do NOT reveal user existence
      return { message: 'If the email exists, a verification email was sent.' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email already verified.' };
    }

    const token = this.generateEmailVerificationToken(user.id);

    const verifyUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.mailService.sendVerifyEmail(user.email, verifyUrl);

    return { message: 'If the email exists, a verification email was sent.' };
  }

  async login(username: string, passwordHash: string, totp?: string) {
    const user = await this.usersService.findUser({ username });

    if (!user) {
      throw new UnauthorizedException('invalid credentials');
    }

    const localAccount = user.accounts.find((a) => a.provider === 'LOCAL');
    if (!localAccount?.passwordHash) {
      throw new UnauthorizedException('This account uses Google login');
    }

    const isMatch = await bcrypt.compare(
      passwordHash,
      localAccount.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'please verify your email before logging in',
      );
    }

    if (user.is2faEnabled) {
      if (!totp) {
        return { requires2fa: true };
      }

      const valid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totp,
        window: 1,
      });

      if (!valid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    const accessPayload: JwtAccessPayloadDto = {
      sub: user.id,
      username: user.username,
    };

    const refreshPayload: JwtRefreshPayloadDto = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        username: user.username,
        email: user.email,
      },
    };
  }

  async refresh(user: JwtAccessPayloadDto) {
    const accessPayload: JwtAccessPayloadDto = {
      sub: user.sub,
      username: user.username,
    };
    return this.jwtService.sign(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
  }

  async logout(userId: number) {
    await this.usersService.invalidateRefreshTokens(userId);

    return { ok: true };
  }

  generateEmailVerificationToken(userId: number) {
    return this.jwtService.sign(
      {
        sub: userId,
        type: 'email-verification',
      },
      {
        secret: this.config.getOrThrow<string>('JWT_EMAIL_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  async verifyEmailToken(token: string) {
    /*   let payload: any;//da levare l'any e da levare il try catch
    try { */
    let payload = this.jwtService.verify(token, {
      secret: this.config.getOrThrow<string>('JWT_EMAIL_SECRET'),
    });
    /* } catch (e) {
      console.error('Verify email token error:', e.message);
      throw new BadRequestException('invalid or expired token');
    } */

    if (payload.type !== 'email-verification') {
      throw new ForbiddenException('invalid token type');
    }

    await this.usersService.markEmailVerified(payload.sub);

    return {
      message:
        'Email successfully verified. You can now log in.' /* ok: true */,
    };
  }

  generatePasswordResetToken(userId: number) {
    return this.jwtService.sign(
      { sub: userId, type: 'password-reset' },
      {
        secret: this.config.getOrThrow('JWT_PASSWORD_RESET_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  async sendPasswordReset(email: string) {
    const user = await this.usersService.findUser({ email });

    // Prevent email enumeration
    if (!user) return;

    const token = this.generatePasswordResetToken(user.id);

    const resetUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/reset-password.html?token=${encodeURIComponent(token)}`;

    await this.mailService.sendResetPasswordEmail(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;

    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_PASSWORD_RESET_SECRET'),
      });
    } catch (e) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload.type !== 'password-reset') {
      throw new ForbiddenException('Invalid token type');
    }

    //to-do mettere controlli su psw

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.usersService.updatePassword(payload.sub, {
      passwordHash: hashed,
    });

    // Invalidate refresh tokens after password change
    await this.usersService.invalidateRefreshTokens(payload.sub);
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    let username = base;
    let i = 0;

    while (await this.usersService.findUser({ username })) {
      i++;
      username = `${base}${i}`;
    }

    return username;
  }

  async loginWithGoogle(googleUser: CreateOAuthUserDto) {
    let user = await this.usersService.findByProvider(
      googleUser.provider,
      googleUser.oauthId,
    );

    if (!user) {
      // Auto-link by email
      user = await this.usersService.findUser({ email: googleUser.email });

      if (user) {
        await this.usersService.linkProvider(user.id, googleUser.provider, {
          oauthId: googleUser.oauthId,
          avatarUrl: googleUser.avatarUrl,
        });
      } else {
        const uniqueUsername = await this.generateUniqueUsername(
          googleUser.username,
        );

        user = await this.usersService.createOAuthUser({
          email: googleUser.email,
          username: uniqueUsername,
          oauthId: googleUser.oauthId,
          provider: googleUser.provider,
          avatarUrl: googleUser.avatarUrl,
        });
      }
    }

    /*       await this.profileClient.upsertProfile({ //forse non va qui ma su strategy o piu prob che devo passare anche photos in googleuser
        userId: user.id,
        avatar: profile.photos?.[0]?.value,
      }); */

    const accessToken = this.jwtService.sign(
      { sub: user.id, username: user.username },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenVersion: user.tokenVersion },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async setup2fa(userId: number) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `MyGame (${userId})`,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    await this.usersService.setup2fa(userId, {
      twoFactorSecret: secret.base32,
    });

    return {
      qrCode,
      //twoFactorSecret: secret.base32, // optional (for backup)
    };
  }

  async enable2fa(userId: number, code: string) {
    const user = await this.usersService.findUser({ id: userId });

    const verified = speakeasy.totp.verify({
      secret: user?.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.usersService.enable2fa(userId);
  }

  async disable2fa(userId: number) {
    await this.usersService.disable2fa(userId);
  }
}
