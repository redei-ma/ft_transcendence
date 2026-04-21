import {
	Controller,
	Post,
	Delete,
	HttpCode,
	HttpStatus,
	UseGuards,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiConsumes,
	ApiBody,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";
import { AvatarService } from "../services/avatar.service";
import { UserProfileResponseDto } from "../dto";

/**
 * Controller for avatar upload and reset endpoints.
 */
@ApiTags("Users")
@Controller("api/users")
export class AvatarController {
	constructor(private readonly avatarService: AvatarService) {}

	/**
	 * Upload a custom avatar image.
	 */
	@Post("me/avatar")
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Throttle({ global: { limit: 5, ttl: 60_000 } })
	@ApiOperation({
		summary: "Upload a custom avatar image (max 5MB, jpeg/png/webp)",
	})
	@ApiConsumes("multipart/form-data")
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				avatar: { type: "string", format: "binary" },
			},
		},
	})
	@ApiResponse({ status: HttpStatus.OK, type: UserProfileResponseDto })
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "No file, invalid type, or not a real image",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	@UseInterceptors(
		FileInterceptor("avatar", {
			storage: memoryStorage(),
			limits: { fileSize: 5 * 1024 * 1024 },
			fileFilter: (
				_req: Express.Request,
				file: Express.Multer.File,
				callback: (error: Error | null, acceptFile: boolean) => void,
			) => {
				const allowed = [
					"image/jpeg",
					"image/png",
					"image/webp",
				];
				if (allowed.includes(file.mimetype)) {
					callback(null, true);
				} else {
					callback(
						new BadRequestException(
							"Only image files are allowed (jpeg, png, webp)",
						),
						false,
					);
				}
			},
		}),
	)
	async uploadAvatar(
		@CurrentUser("sub") userId: number,
		@UploadedFile() file: Express.Multer.File | undefined,
	): Promise<UserProfileResponseDto> {
		if (!file) {
			throw new BadRequestException("Avatar file is required");
		}
		return this.avatarService.uploadAvatar(userId, file.buffer);
	}

	/**
	 * Reset avatar to default.
	 */
	@Delete("me/avatar")
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Reset avatar to default DiceBear" })
	@ApiResponse({ status: HttpStatus.OK, type: UserProfileResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async resetAvatar(
		@CurrentUser("sub") userId: number,
	): Promise<UserProfileResponseDto> {
		return this.avatarService.resetAvatar(userId);
	}
}
