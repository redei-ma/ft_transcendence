import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JwtAccessPayloadDto, JwtRefreshPayloadDto } from '@transcendence/auth';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail/mail.service';
import { UserClient } from '../user/user.client';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import {
  CreateOAuthUserDto,
  CreateLocalUserNoHashDto,
} from '@transcendence/dto';
import { UserStatus, Provider } from '@transcendence/types';
import {
  ResetPasswordDto,
  ChangePasswordDto,
  EmailDto,
  NewEmailDto,
  LoginDto,
  Enable2FADto,
  ConfirmPasswordDto,
} from '../../dto/input.dto';
import { isEmail } from 'class-validator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private usersService: UserClient,
  ) {}

  async registerAndSendVerification(dto: CreateLocalUserNoHashDto) {
    // Check if email already exists
    const existingEmail = await this.usersService.findUser({
      email: dto.email,
    });
    if (existingEmail) {
      this.logger.warn(`[Register] Registration failed: email already in use (${dto.email})`);
      throw new BadRequestException('Registration failed. Please check your details.');
    }

    // Check if username already exists
    const existingUsername = await this.usersService.findUser({
      username: dto.username,
    });
    if (existingUsername) {
      this.logger.warn(`[Register] Registration failed: username already in use (${dto.username})`);
      throw new BadRequestException('Registration failed. Please check your details.');
    }

    try {
      // Hash password
      const passwordHash = await bcrypt.hash(dto.password, 10);

      // Create user
      const user = await this.usersService.createUser({
        username: dto.username,
        email: dto.email,
        passwordHash,
      });

      // Email Verification Logic
      const token = this.generateEmailVerificationToken(user.id);
      const verifyUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

      await this.mailService.sendVerifyEmail(user.email, verifyUrl);

      this.logger.log(`[Register] New user registered: ${user.username} (id=${user.id})`);
      return {
        message: `Welcome ${user.username}! Please check your email.`,
        user: { username: user.username, email: user.email },
      };
    } catch (error) {
      throw new BadRequestException(
        'Registration failed. Please try again later.',
      );
    }
  }

  async resendVerificationEmail(dto: EmailDto) {
    const user = await this.usersService.findUser(dto);

    if (!user) {
      // Do NOT reveal user existence
      return {
        message:
          'If an account with this email exists and is not verified, a verification email was sent.',
      };
    }

    if (user.isEmailVerified) {
      return {
        message:
          'If an account with this email exists and is not verified, a verification email was sent.',
      };
    }

    const token = this.generateEmailVerificationToken(user.id);
    const verifyUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.mailService.sendVerifyEmail(user.email, verifyUrl);

    return {
      message:
        'If an account with this email exists and is not verified, a verification email was sent.',
    };
  }

  async login(dto: LoginDto) {
    let user = await this.usersService.findUser({ username: dto.identifier });

    if (!user && isEmail(dto.identifier)) {
      user = await this.usersService.findUser({ email: dto.identifier });
    }

    if (!user) {
      this.logger.warn(`[Login] Failed login attempt: user not found (identifier=${dto.identifier})`);
      throw new UnauthorizedException('invalid credentials');
    }

    const localAccount = user.accounts.find(
      (a) => a.provider === Provider.LOCAL,
    );
    if (!localAccount?.passwordHash) {
      this.logger.warn(`[Login] Failed login: OAuth-only account tried local login (userId=${user.id})`);
      throw new UnauthorizedException('This account uses Google login');
    }

    const isMatch = await bcrypt.compare(
      dto.password,
      localAccount.passwordHash,
    );
    if (!isMatch) {
      this.logger.warn(`[Login] Failed login: wrong password (userId=${user.id})`);
      throw new UnauthorizedException('invalid credentials');
    }

    if (!user.isEmailVerified) {
      this.logger.warn(`[Login] Failed login: email not verified (userId=${user.id})`);
      throw new ForbiddenException(
        'please verify your email before logging in',
      );
    }

    if (user.is2faEnabled) {
      if (!dto.totp) {
        return { requires2fa: true };
      }

      const valid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: dto.totp,
        window: 1,
      });

      if (!valid) {
        this.logger.warn(`[Login] Failed login: invalid 2FA code (userId=${user.id})`);
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    if (user.status !== UserStatus.OFFLINE) {
      this.logger.warn(`[Login] Failed login: account already online (userId=${user.id})`);
      throw new ForbiddenException('This account is already logged in');
    }

    const newTokenVersion = await this.usersService.invalidateRefreshTokens(user.id);

    const accessPayload: JwtAccessPayloadDto = {
      sub: user.id,
      username: user.username,
    };

    const refreshPayload: JwtRefreshPayloadDto = {
      sub: user.id,
      tokenVersion: newTokenVersion,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const status = UserStatus.ONLINE;
    await this.usersService.updateStatus(user.id, { status });

    this.logger.log(`[Login] User logged in: ${user.username} (id=${user.id})`);
    return {
      accessToken,
      refreshToken,
      user: {
        username: user.username,
        email: user.email,
      },
    };
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
    const payload = this.jwtService.verify(token, {
      secret: this.config.getOrThrow<string>('JWT_EMAIL_SECRET'),
    });

    if (payload.type !== 'email-verification') {
      throw new ForbiddenException('invalid token type');
    }

    await this.usersService.markEmailVerified(payload.sub);

    this.logger.log(`[EmailVerify] Email verified for userId=${payload.sub}`);
    return { message: 'Email successfully verified. You can now log in.' };
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

    const status = UserStatus.OFFLINE;
    await this.usersService.updateStatus(userId, { status });

    this.logger.log(`[Logout] User logged out: userId=${userId}`);
    return { ok: true };
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

  async sendPasswordReset(dto: EmailDto) {
    const user = await this.usersService.findUser(dto);

    // Prevent email enumeration
    if (!user) return;

    const token = this.generatePasswordResetToken(user.id);

    const resetUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/reset-password.html?token=${encodeURIComponent(token)}`;

    await this.mailService.sendResetPasswordEmail(user.email, resetUrl);
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: number; type: string };

    try {
      payload = this.jwtService.verify(decodeURIComponent(dto.token), {
        secret: this.config.getOrThrow<string>('JWT_PASSWORD_RESET_SECRET'),
      });
    } catch (e) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload.type !== 'password-reset') {
      throw new ForbiddenException('Invalid token type');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.updatePassword(payload.sub, {
      passwordHash: hashed,
    });

    // Invalidate refresh tokens after password change
    await this.usersService.invalidateRefreshTokens(payload.sub);

    const status = UserStatus.OFFLINE;
    await this.usersService.updateStatus(payload.sub, { status });
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

  async loginWithGoogle(googleUser: CreateOAuthUserDto): Promise<{ accessToken: string; refreshToken: string; wasLinked: boolean }> {
    let wasLinked = false;

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
        wasLinked = true;
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

    const newTokenVersion = await this.usersService.invalidateRefreshTokens(user.id);

    const accessToken = this.jwtService.sign(
      { sub: user.id, username: user.username },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenVersion: newTokenVersion },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    this.logger.log(`[OAuth] Google login: userId=${user.id} username=${user.username} wasLinked=${wasLinked}`);
    return { accessToken, refreshToken, wasLinked };
  }

  async unlinkProvider(userId: number, provider: Provider): Promise<void> {
    if (provider === Provider.LOCAL) {
      throw new BadRequestException('Cannot unlink local account via this endpoint.');
    }
    const user = await this.usersService.findUser({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    await this.usersService.unlinkOAuth(userId, provider);
    this.logger.log(`[Provider] Provider ${provider} unlinked for userId=${userId}`);
  }

  async setup2fa(userId: number) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Clash of Olympus`,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    await this.usersService.setup2fa(userId, {
      twoFactorSecret: secret.base32,
    });

    return {
      qrCode,
    };
  }

  async enable2fa(userId: number, dto: Enable2FADto) {
    const user = await this.usersService.findUser({ id: userId });

    if (!user) throw new NotFoundException();

    const verified = speakeasy.totp.verify({
      secret: user?.twoFactorSecret,
      encoding: 'base32',
      token: dto.code,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid 2FA code');
    }

    await this.usersService.enable2fa(userId);
    this.logger.log(`[2FA] 2FA enabled for userId=${userId}`);
  }

  async disable2fa(userId: number) {
    await this.usersService.disable2fa(userId);
    this.logger.log(`[2FA] 2FA disabled for userId=${userId}`);
  }

  async requestEmailChange(userId: number, dto: NewEmailDto) {
    const user = await this.usersService.findUser({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // Check for LOCAL account and verify password
    const localAccount = user.accounts.find(
      (a) => a.provider === Provider.LOCAL,
    );
    if (!localAccount || !localAccount.passwordHash) {
      throw new ForbiddenException(
        'Local account password required to change email.',
      );
    }

    const isMatch = await bcrypt.compare(
      dto.password,
      localAccount.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Current password incorrect ');
    }

    if (user.email === dto.newEmail) {
      throw new BadRequestException(
        'The new email must be different from the current one.',
      );
    }

    const existingUser = await this.usersService.findUser({
      email: dto.newEmail,
    });
    if (existingUser) {
      throw new ConflictException(
        'This email is already associated with another account.',
      );
    }

    const token = this.jwtService.sign(
      { sub: userId, newEmail: dto.newEmail, type: 'email-change' },
      {
        secret: this.config.getOrThrow('JWT_EMAIL_SECRET'),
        expiresIn: '15m',
      },
    );

    const verifyUrl = `${this.config.getOrThrow('PUBLIC_URL')}/api/auth/confirm-email-change?token=${encodeURIComponent(token)}`;
    await this.mailService.sendVerifyEmail(dto.newEmail, verifyUrl);

    this.logger.log(`[EmailChange] Email change requested for userId=${userId} → ${dto.newEmail}`);
    return {
      message:
        'Confirmation email sent to your new address. By changing email all other Id Provider (es. Google) will be disconnected. ',
    };
  }

  async deleteAccount(userId: number, dto: ConfirmPasswordDto): Promise<void> {
    const user = await this.usersService.findUser({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const localAccount = user.accounts.find(
      (a) => a.provider === Provider.LOCAL,
    );

    if (localAccount && localAccount.passwordHash) {
      const isMatch = await bcrypt.compare(dto.password ?? '', localAccount.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Current password incorrect.');
      }
    }

    await this.usersService.deleteUser(userId);
    this.logger.log(`[Account] Account deleted for userId=${userId}`);
  }

  async confirmEmailChange(token: string) {
    const payload = this.jwtService.verify(token, {
      secret: this.config.getOrThrow('JWT_EMAIL_SECRET'),
    });

    if (payload.type !== 'email-change') {
      throw new ForbiddenException('Invalid token type');
    }

    const user = await this.usersService.findUser({ id: payload.sub });
    if (!user) throw new NotFoundException('User not found. ');

    // Check if new email is taken by someone else in the meantime
    const existingUser = await this.usersService.findUser({
      email: payload.newEmail,
    });
    if (existingUser) throw new ConflictException('Email already in use. ');

    // Update the actual email (user-service handles OAuth unlinking internally)
    await this.usersService.updateEmail(user.id, { email: payload.newEmail });

    this.logger.log(`[EmailChange] Email updated for userId=${user.id} → ${payload.newEmail}`);
    return {
      message:
        'Email updated successfully. OAuth accounts have been unlinked for security. If you re-enter through Google with the old email a new account will be created. ',
    };
  }

  async changePassword(userId: number, body: ChangePasswordDto): Promise<{ requiresLogout: boolean }> {
    const user = await this.usersService.findUser({ id: userId });
    if (!user) throw new NotFoundException();

    const localAccount = user?.accounts.find(
      (a) => a.provider === Provider.LOCAL,
    );

    const isFirstTimeSet = !localAccount?.passwordHash;

    // If they have a password, they MUST verify the old one
    if (localAccount?.passwordHash) {
      if (!body.oldPass) {
        throw new UnauthorizedException('Current password required.');
      }
      const isMatch = await bcrypt.compare(
        body.oldPass,
        localAccount.passwordHash,
      );
      if (!isMatch) {
        throw new UnauthorizedException('Current password incorrect ');
      }

      // Check if new password is same as old
      if (await bcrypt.compare(body.newPass, localAccount.passwordHash)) {
        throw new BadRequestException(
          'New password must be different from the old one.',
        );
      }
    }
    // If no local account exists yet, we will create one during updatePassword
    // or update the existing LOCAL entry if it exists without a password.

    // Hash and Update
    const hashed = await bcrypt.hash(body.newPass, 10);

    // BRANCHING LOGIC: Update vs Set
    if (localAccount) {
      // Account exists, just update it
      await this.usersService.updatePassword(userId, { passwordHash: hashed });
    } else {
      // No local account row exists at all, create it
      await this.usersService.setPassword(userId, { passwordHash: hashed });
    }

    // Only invalidate sessions when changing an existing password (security measure).
    // Setting a password for the first time on an OAuth account does not require logout.
    if (!isFirstTimeSet) {
      await this.usersService.invalidateRefreshTokens(userId);
      const status = UserStatus.OFFLINE;
      await this.usersService.updateStatus(userId, { status });
    }

    this.logger.log(`[Password] Password ${isFirstTimeSet ? 'set' : 'changed'} for userId=${userId} (requiresLogout=${!isFirstTimeSet})`);
    return { requiresLogout: !isFirstTimeSet };
  }
}
