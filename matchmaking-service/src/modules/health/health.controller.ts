import { Controller, Get } from '@nestjs/common';
import {
	HealthCheck,
	HealthCheckService,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private redis: RedisHealthIndicator,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([
			() => this.redis.isHealthy('redis'),
		]);
	}
}
