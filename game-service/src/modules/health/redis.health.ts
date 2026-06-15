import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
	HealthCheckError,
	HealthIndicator,
	HealthIndicatorResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator
	extends HealthIndicator
	implements OnModuleDestroy
{
	private readonly client: Redis;

	constructor(private readonly configService: ConfigService) {
		super();
		this.client = new Redis({
			host: this.configService.get<string>('REDIS_HOST'),
			port: this.configService.get<number>('REDIS_PORT'),
			lazyConnect: true,
		});
	}

	async isHealthy(key: string): Promise<HealthIndicatorResult> {
		try {
			const response = await this.client.ping();
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

	onModuleDestroy() {
		this.client.disconnect();
	}
}
