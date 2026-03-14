import { IsUsernameField } from "@transcendence/dto";

/**
 * Update username.
 */
export class UpdateUsernameDto {
	@IsUsernameField()
	username: string;
}
