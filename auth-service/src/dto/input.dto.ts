import { IsString, MinLength } from 'class-validator';
import { IsEmailField, IsPasswordField } from '@transcendence/dto';

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
  /* 	@IsString()
	@MinLength(1)
	password: string; */

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
  password: string;
}
