import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerRequest } from "@nestjs/throttler";

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
	async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
		const { context, limit, ttl, throttler, blockDuration, generateKey } = requestProps;

		// I check if the event is the same that the guardian is checking
		if (context.switchToWs().getPattern() !== throttler.name!) return true;

		// Extract the client's IP address from the WebSocket context
		const client = context.switchToWs().getClient();
		
		if (!client || !client.conn) return true;
		if (client.isAiPlayer) return true;

		const tracker = client.conn.remoteAddress || client._socket.remoteAddress;
		const key = generateKey(context, tracker, throttler.name!);
		const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
			await this.storageService.increment(key, ttl, limit, blockDuration, throttler.name!);

		// Throw an error when the user reached their limit.
		if (isBlocked) {
			await this.throwThrottlingException(context, {
				limit,
				ttl,
				key,
				tracker,
				totalHits,
				timeToExpire,
				isBlocked,
				timeToBlockExpire,
			});
		}

		return true;
	}
}