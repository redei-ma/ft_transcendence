import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { InviteStatus, UserStatus } from "@transcendence/types";

@Injectable()
export class CleanupService implements OnModuleInit {
	private readonly logger = new Logger(CleanupService.name);

	constructor(private readonly prisma: PrismaService) {}

	async onModuleInit(): Promise<void> {
		const result = await this.prisma.user.updateMany({
			where: { status: { not: UserStatus.OFFLINE } },
			data: { status: UserStatus.OFFLINE },
		});
		this.logger.log(`Startup: reset ${result.count} users to OFFLINE`);
	}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async deleteUnverifiedUsers(): Promise<void> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - 3);

		this.logger.log("Running unverified users cleanup...");

		const result = await this.prisma.user.deleteMany({
			where: {
				isEmailVerified: false,
				createdAt: { lt: cutoff },
			},
		});

		this.logger.log(`Cleanup: deleted ${result.count} unverified users`);
	}

	@Cron(CronExpression.EVERY_HOUR)
	async expireStaleInvites(): Promise<void> {
		const result = await this.prisma.gameInvite.updateMany({
			where: {
				status: InviteStatus.PENDING,
				expiresAt: { lt: new Date() },
			},
			data: { status: InviteStatus.EXPIRED },
		});

		if (result.count > 0) {
			this.logger.log(`Cleanup: expired ${result.count} stale game invites`);
		}
	}
}
