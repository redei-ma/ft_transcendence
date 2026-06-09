import {
	ConflictException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Prisma select for user queries that include accounts (internal API).
 */
export const USER_WITH_ACCOUNTS_SELECT = {
	id: true,
	email: true,
	username: true,
	avatarUrl: true,
	status: true,
	createdAt: true,
	isEmailVerified: true,
	twoFactorSecret: true,
	is2faEnabled: true,
	tokenVersion: true,
	accounts: {
		select: {
			id: true,
			provider: true,
			passwordHash: true,
			oauthId: true,
		},
	},
} as const;

/**
 * Prisma select for public user profile responses.
 */
export const USER_PROFILE_SELECT = {
	id: true,
	email: true,
	username: true,
	avatarUrl: true,
	status: true,
	createdAt: true,
} as const;

/** Generates a default avatar URL using the DiceBear Shapes API. */
export const generateDefaultAvatar = (seed: string): string =>
	`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;

/** Checks if the given URL is a default avatar. */
export const isDefaultAvatar = (url: string): boolean =>
	url.startsWith("https://api.dicebear.com/");

/** Checks if the given URL points to a user-uploaded avatar stored on the server. */
export const isUploadedAvatar = (url: string): boolean =>
	url.startsWith("/uploads/");

export const UPLOAD_DIR = "/uploads/avatars";

/**
 * Throws NotFoundException if no user exists with the given ID.
 */
export async function ensureUserExists(
	prisma: PrismaService,
	id: number,
): Promise<void> {
	const user = await prisma.user.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!user) {
		throw new NotFoundException("User not found");
	}
}

/**
 * Throws ConflictException if email or username are already registered.
 */
export async function ensureEmailAndUsernameAvailable(
	prisma: PrismaService,
	email: string,
	username: string,
): Promise<void> {
	const existing = await prisma.user.findFirst({
		where: { OR: [{ email }, { username }] },
		select: { email: true, username: true },
	});

	if (existing) {
		if (existing.email === email) {
			throw new ConflictException("Email is already registered");
		}
		throw new ConflictException("Username is already taken");
	}
}
