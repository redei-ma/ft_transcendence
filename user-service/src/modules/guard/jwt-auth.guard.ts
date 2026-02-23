import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

/**
 * Guard that validates the JWT token from the Authorization header.
 *
 * Extracts the Bearer token, verifies it, and attaches the decoded
 * payload to `request.user` for downstream decorators (@CurrentUser).
 *
 * Usage:
 * ```
 * @UseGuards(JwtAuthGuard)
 * @Get("me")
 * async getMyProfile(@CurrentUser("id") userId: number) { ... }
 * ```
 *
 * Expected JWT payload:
 * - `sub` (number) — user ID
 * - `email` (string)
 * - `tokenVersion` (number)
 *
 * The guard normalizes `sub` → `id` on request.user for convenience.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private readonly jwtService: JwtService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		const token = this.extractToken(request);

		if (!token) {
			throw new UnauthorizedException("Missing authorization token");
		}

		try {
			const payload = this.jwtService.verify(token);

			// Normalize: JWT usa "sub" per convenzione, noi usiamo "id" internamente
			request.user = {
				id: payload.sub,
				email: payload.email,
				tokenVersion: payload.tokenVersion,
			};

			return true;
		} catch {
			throw new UnauthorizedException("Invalid or expired token");
		}
	}

	private extractToken(request: Request): string | null {
		const header = request.headers.authorization;
		if (!header?.startsWith("Bearer ")) return null;
		return header.slice(7);
	}
}
