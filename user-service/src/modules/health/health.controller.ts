import { Controller, Get } from "@nestjs/common";
import {
	HealthCheck,
	HealthCheckService,
	PrismaHealthIndicator,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private db: PrismaHealthIndicator,
		private prisma: PrismaService,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([
			// Verifies database connectivity.
			// If the database is unreachable, it automatically returns a 503 Service Unavailable status,
			// indicating the service is not healthy.
			() => this.db.pingCheck("database", this.prisma, { timeout: 5000 }),
		]);
	}
}
