import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * PrismaService extends PrismaClient and implements NestJS lifecycle hooks.
 * - OnModuleInit: Connects to database when module initializes
 * - OnModuleDestroy: Disconnects when application shuts down (graceful shutdown)
 */
@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(PrismaService.name);

	constructor() {
		super({
			log:
				process.env.NODE_ENV === "development"
					? ["query", "error", "warn"]
					: ["error"],
		});
	}

	/**
	 * Connect to database when the module is initialized
	 */
	async onModuleInit() {
		await this.$connect();
		this.logger.log("PrismaClient connected");
	}

	/**
	 * Gracefully disconnect from database when the app shuts down
	 */
	async onModuleDestroy() {
		await this.$disconnect();
		this.logger.log("PrismaClient disconnected");
	}
}
