import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
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
		console.log("PrismaClient connected");
	}

	/**
	 * Gracefully disconnect from database when the app shuts down
	 */
	async onModuleDestroy() {
		await this.$disconnect();
		console.log("PrismaClient disconnected");
	}
}
