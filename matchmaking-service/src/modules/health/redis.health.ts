import { Injectable } from '@nestjs/common';
import {
	HealthCheckError,
	HealthIndicator,
	HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
	constructor(@InjectRedis() private readonly redis: Redis) {
		super();
	}

	async isHealthy(key: string): Promise<HealthIndicatorResult> {
		try {
			const response = await this.redis.ping();
			if (response !== 'PONG') {
				throw new Error('Unexpected ping response');
			}
			return this.getStatus(key, true);
		} catch (error) {
			throw new HealthCheckError(
				'Redis check failed',
				this.getStatus(key, false),
			);
		}
	}
}
