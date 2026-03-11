
import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JwtAccessPayloadDto, JwtRefreshPayloadDto} from '@transcendence/auth';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail/mail.service';
import { UserClient } from '../user/user.client';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { CreateOAuthUserDto, CreateLocalUserNoHashDto } from '@transcendence/types';
import { ResetPasswordDto, ChangePasswordDto, EmailDto, NewEmailDto } from '../../dto/input.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly  config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private usersService: UserClient,
  ) {}


async registerAndSendVerification( dto: CreateLocalUserNoHashDto) {
/*     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;

    if (!dto.password || dto.password.length < 10) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    if (!passwordRegex.test(dto.password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character: @$!%*?&');
    } */
    try {

      const passwordHash = await bcrypt.hash(dto.password, 10);

      const user = await this.usersService.createUser({username: dto.username, email: dto.email, passwordHash});

      const token = this.generateEmailVerificationToken(user.id);

      const verifyUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

      await this.mailService.sendVerifyEmail(user.email, verifyUrl);

      return {
        message: `Welcome ${user.username}! Please check your email.`,
        user: { username: user.username, email: user.email }
      };

    } catch (error) {
      throw new BadRequestException('Registration failed.');
    }
  }

  async resendVerificationEmail(dto: EmailDto ) {
    const user = await this.usersService.findUser(dto);

    if (!user) {
      // Do NOT reveal user existence
      return { message: 'If an account with this email exists and is not verified, a verification email was sent.' };
    }

    if (user.isEmailVerified) {
      return { message: 'If an account with this email exists and is not verified, a verification email was sent.' };
    }

    const token = this.generateEmailVerificationToken(user.id);

    const verifyUrl = `${this.config.getOrThrow<string>('PUBLIC_URL')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.mailService.sendVerifyEmail(user.email, verifyUrl);

    return { message: 'If an account with this email exists and is not verified, a verification email was sent.' };
  }

  async login(username: string, passwordHash: string, totp?: string) {
    let user = await this.usersService.findUser({ username });

    if (!user) {
      user = await this.usersService.findUser({ email: username });
    }

    if (!user) {
      throw new UnauthorizedException('invalid credentials');
    }

    const localAccount = user.accounts.find((a) => a.provider === 'LOCAL');
    if (!localAccount?.passwordHash) {
      throw new UnauthorizedException('This account uses Google login');
    }

    const isMatch = await bcrypt.compare(passwordHash, localAccount.passwordHash);
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

    return { message: 'Email successfully verified. You can now log in.' };
  }

	async refresh(user: JwtAccessPayloadDto) {

		const accessPayload: JwtAccessPayloadDto = {
      sub: user.sub,
      username: user.username,
    };
		return this.jwtService.sign(
			accessPayload, {
			secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
   		expiresIn: '15m',
			});
	}

	async logout(userId: number ) {
		await this.usersService.invalidateRefreshTokens(userId);

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

  async sendPasswordReset( dto: EmailDto ) {
    const user = await this.usersService.findUser(dto);

    // Prevent email enumeration
    if (!user) return;

    const token = this.generatePasswordResetToken(user.id);

    const resetUrl =
      `${this.config.getOrThrow<string>('PUBLIC_URL')}/reset-password.html?token=${encodeURIComponent(token)}`;

    await this.mailService.sendResetPasswordEmail(user.email, resetUrl);
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;

    try {
      payload = this.jwtService.verify(dto.token, {
        secret: this.config.getOrThrow<string>('JWT_PASSWORD_RESET_SECRET'),
      });
    } catch (e) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload.type !== 'password-reset') {
      throw new ForbiddenException('Invalid token type');
    }

    //to-do mettere controlli su psw

    const hashed = await bcrypt.hash(dto.password, 10);

    await this.usersService.updatePassword(payload.sub, {passwordHash: hashed});

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
        await this.usersService.linkProvider(
          user.id,
          googleUser.provider,
          {
            oauthId: googleUser.oauthId,
            avatarUrl: googleUser.avatarUrl,
          });
      } else {
        const uniqueUsername = await this.generateUniqueUsername( googleUser.username );

        user = await this.usersService.createOAuthUser({
          email: googleUser.email,
          username: uniqueUsername,
          oauthId: googleUser.oauthId,
          provider: googleUser.provider,
          avatarUrl: googleUser.avatarUrl,
        });
      }
    }

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

    await this.usersService.setup2fa(userId, {twoFactorSecret: secret.base32});

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

// --- EMAIL CHANGE LOGIC ---

  async requestEmailChange(userId: number, dto: NewEmailDto) {

    const user = await this.usersService.findUser({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const hasLocalAccount = user.accounts.some(a => a.provider === 'LOCAL');
    if (!hasLocalAccount) {
        throw new ForbiddenException(
            'Accounts logged in exclusively with other Identity Providers cannot change their email. Add local password to be able to change your email.'
        );
    }

    if (user.email === dto.newEmail) {
        throw new BadRequestException('The new email must be different from the current one.');
    }

    const existingUser = await this.usersService.findUser({ email: dto.newEmail });
    if (existingUser) {
        throw new ConflictException('This email is already associated with another account.');
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
    return { message: 'Confirmation email sent to your new address. You have 15 minutes to confirm the new email, only then it will be modified' };
  }

  async confirmEmailChange(token: string) {
    const payload = this.jwtService.verify(token, {
      secret: this.config.getOrThrow('JWT_EMAIL_SECRET'),
    });

    if (payload.type !== 'email-change') {
      throw new ForbiddenException('Invalid token type');
    }

    const existingUser = await this.usersService.findUser({ email: payload.newEmail });
    if (existingUser) {
        throw new ConflictException('Email update failed. This email is already associated with another account.');
    }

    await this.usersService.updateEmail(payload.sub, { email: payload.newEmail });

    await this.usersService.markEmailVerified(payload.sub);

    return { message: 'Email updated successfully.' };//mettere pagina anche qui?
  }

  // --- PASSWORD CHANGE LOGIC ---

/*   async changePassword(userId: number, oldPass: string, newPass: string) {
    // 1. Get user including the password hash
    const user = await this.usersService.findUser({ id: userId });
    const localAccount = user?.accounts.find(a => a.provider === 'LOCAL');

    //aggiungere caso se uno e entrato con google?
    if (!localAccount?.passwordHash) {
      throw new BadRequestException('No local password set for this account.');
    }

    // 2. Verify old password
    const isMatch = await bcrypt.compare(oldPass, localAccount.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password incorrect');
    }

    // 3. Validate new password (use your existing regex)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (newPass.length < 10 || !passwordRegex.test(newPass)) {
      throw new BadRequestException('New password does not meet security requirements.');
    }
    //controllare che nuova pass sia diversa da vecchia?
    // 4. Hash and Update
    const hashed = await bcrypt.hash(newPass, 10);
    await this.usersService.updatePassword(userId, { passwordHash: hashed });

    // 5. Security: Invalidate existing sessions
    await this.usersService.invalidateRefreshTokens(userId);
  } */

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usersService.findUser({ id: userId });
    const localAccount = user?.accounts.find(a => a.provider === 'LOCAL');

    // If they have a password, they MUST verify the old one
    if (localAccount?.passwordHash) {
        const isMatch = await bcrypt.compare(dto.oldPass, localAccount.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException('Current password incorrect');
        }

        // Check if new password is same as old
        if (await bcrypt.compare(dto.newPass, localAccount.passwordHash)) {
            throw new BadRequestException('New password must be different from the old one.');
        }
    }
    // If no local account exists yet, we will create one during updatePassword
    // or update the existing LOCAL entry if it exists without a password.

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (dto.newPass.length < 10 || !passwordRegex.test(dto.newPass)) {
        throw new BadRequestException('New password does not meet security requirements.');
    }

    // Hash and Update
    const hashed = await bcrypt.hash(dto.newPass, 10);

    // BRANCHING LOGIC: Update vs Set
    if (localAccount) {
        // Account exists, just update it
        await this.usersService.updatePassword(userId, { passwordHash: hashed });
    } else {
        // No local account row exists at all, create it
        await this.usersService.setPassword(userId, { passwordHash: hashed });
    }

    // Invalidate sessions
    await this.usersService.invalidateRefreshTokens(userId);
    //cancellare anche cookies?
  }
}
