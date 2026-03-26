import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { IsEmailField, IsPasswordField, IsEmailOrUsernameField, IsTotpField } from '@transcendence/dto';


/**
 * Input DTO for login.
 */
export class LoginDto {
  @IsEmailOrUsernameField()
  identifier: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsTotpField()
  totp?: string;
}

/**
 * Input DTO for changing/adding email.
 */
export class EmailDto {
  @IsEmailField()
  email: string;
}

/**
 * Input DTO for changing email.
 */
export class NewEmailDto {
  @IsString()
	@MinLength(1)
	password: string;

  @IsEmailField()
  newEmail: string;
}

/**
 * Input DTO for changing/adding password.
 * Password must not be hased yet
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  oldPass: string;

  @IsPasswordField()
  newPass: string;
}

/**
 * Input DTO for resetting password.
 * Password must not be hased yet
 */
export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token: string;

  @IsPasswordField()
  newPassword: string;
}

/**
 * Input DTO for enabling 2FA.
 */
export class Enable2FADto {

  @IsTotpField()
  code: string;
}

export class TokenQueryDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
