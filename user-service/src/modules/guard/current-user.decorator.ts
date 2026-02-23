import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Custom parameter decorator that extracts user data from the JWT payload.
 *
 * The JwtAuthGuard must be active on the route for this to work.
 * It reads from `request.user`, which the guard populates after
 * verifying the token.
 *
 * Available fields (set by JwtAuthGuard):
 * - `id` (number) — user ID (from JWT `sub`)
 * - `email` (string)
 * - `tokenVersion` (number)
 *
 * Usage:
 * ```
 * // Get a single field
 * @CurrentUser("id") userId: number
 *
 * // Get the entire payload
 * @CurrentUser() user: JwtPayload
 * ```
 */
export const CurrentUser = createParamDecorator(
	(field: string | undefined, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest();
		const user = request.user;
		return field ? user?.[field] : user;
	},
);
