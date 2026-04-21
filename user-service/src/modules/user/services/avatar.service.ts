import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { unlink, mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import sharp from "sharp";
import { UserProfileResponseDto } from "../dto";
import {
	USER_PROFILE_SELECT,
	UPLOAD_DIR,
	generateDefaultAvatar,
	isUploadedAvatar,
} from "../helpers";

@Injectable()
export class AvatarService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Saves an uploaded avatar file after sanitizing it with Sharp.
	 * Sharp re-encodes the image to JPEG 512x512, stripping all metadata
	 * and rejecting any buffer that is not a valid image.
	 * If the user previously had a custom uploaded avatar, the old file is deleted.
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @param fileBuffer - Raw buffer of the uploaded file.
	 * @returns UserProfileResponseDto — updated profile with new avatarUrl.
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws BadRequestException (400) — if the uploaded file is not a valid image.
	 */
	async uploadAvatar(
		userId: number,
		fileBuffer: Buffer,
	): Promise<UserProfileResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, avatarUrl: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		let sanitizedBuffer: Buffer;
		try {
			sanitizedBuffer = await sharp(fileBuffer)
				.resize({ width: 512, height: 512, fit: "cover" })
				.jpeg({ quality: 85 })
				.toBuffer();
		} catch {
			throw new BadRequestException(
				"Invalid image file: could not process the uploaded content",
			);
		}

		await mkdir(UPLOAD_DIR, { recursive: true });

		const fileName = `${randomUUID()}.jpg`;
		const filePath = join(UPLOAD_DIR, fileName);
		const publicUrl = `/uploads/avatars/${fileName}`;

		await writeFile(filePath, sanitizedBuffer);

		if (isUploadedAvatar(user.avatarUrl)) {
			await unlink(join("/", user.avatarUrl)).catch(() => undefined);
		}

		return this.prisma.user.update({
			where: { id: userId },
			data: { avatarUrl: publicUrl },
			select: USER_PROFILE_SELECT,
		});
	}

	/**
	 * Resets the user's avatar to the DiceBear default.
	 * If the user had a custom uploaded avatar, the file is deleted from disk.
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @returns UserProfileResponseDto — updated profile with default avatarUrl.
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async resetAvatar(userId: number): Promise<UserProfileResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, username: true, avatarUrl: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		if (isUploadedAvatar(user.avatarUrl)) {
			await unlink(join("/", user.avatarUrl)).catch(() => undefined);
		}

		return this.prisma.user.update({
			where: { id: userId },
			data: { avatarUrl: generateDefaultAvatar(user.username) },
			select: USER_PROFILE_SELECT,
		});
	}
}
