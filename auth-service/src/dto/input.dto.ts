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
  @IsEmailField()
  newEmail: string;
}

/**
 * Input DTO for changing/adding password.
 * Password must not be hased yet
 */
export class ChangePasswordDto {
  oldPass: string;

  @IsPasswordField()
  newPass: string;
}

/**
 * Input DTO for resetting password.
 * Password must not be hased yet
 */
export class ResetPasswordDto {
  token: string;

  @IsPasswordField()
  password: string;
}
