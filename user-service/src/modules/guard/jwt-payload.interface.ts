/**
 * Shape of the decoded JWT payload after JwtAuthGuard processing.
 *
 * This is what `request.user` contains and what @CurrentUser() returns
 * when called without arguments.
 *
 * Maps from JWT standard claims:
 * - `sub` → `id`
 */
export interface JwtPayload {
	id: number;
	email: string;
	tokenVersion: number;
}
