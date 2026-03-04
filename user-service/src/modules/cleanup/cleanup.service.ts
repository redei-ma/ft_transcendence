import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CleanupService {
	private readonly logger = new Logger(CleanupService.name);

	constructor(private readonly prisma: PrismaService) {}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async deleteUnverifiedUsers(): Promise<void> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - 3);

		const result = await this.prisma.user.deleteMany({
			where: {
				isEmailVerified: false,
				createdAt: { lt: cutoff },
			},
		});

		this.logger.log(
			`Cleanup: eliminati ${result.count} utenti non verificati`,
		);
	}
}
