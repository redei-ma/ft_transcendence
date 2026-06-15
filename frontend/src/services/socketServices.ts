import { io, Socket } from "socket.io-client";
import * as msgpackParser from "socket.io-msgpack-parser";
import { GameEvents } from '@transcendence/types';
import { refreshToken } from "../site/services/authService";
import { logger } from "../configs/logger";

export interface AckResponse {
  status: 'success' | 'error';
  message: string;
  errorCode?: string;
}

export class SocketService {
	private socket: Socket | null = null;
	private listenerMap = new Map<(data: unknown) => void, (data: unknown) => void>();

	private onGameError: ((code: string, message: string) => void) | null = null;

	setOnGameError(handler: ((code: string, message: string) => void) | null) {
		this.onGameError = handler;
	}

	public getSocket(): Socket | null {
		return this.socket;
	}

	connect(url: string, userDbId?: string): Socket {
		if (this.socket) {
			if (this.socket.connected) {
				logger.debug('GameSocket', 'Already connected.');
				return this.socket;
			}
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
			this.listenerMap.clear();
		}

		logger.log('GameSocket', `Initiating connection for UserDB ID: ${userDbId ?? 'None'}...`);
		this.socket = io(url, {
			path: "/ws/game/socket.io",
			transports: ["websocket", "polling"],
			parser: msgpackParser,
			withCredentials: true,
			reconnection: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
			query: userDbId ? { userDbId } : {},
		});

		this.socket.on("connect", () =>
			logger.log('GameSocket', `Connected. Socket ID: ${this.socket?.id}`),
		);
		this.socket.on("disconnect", (reason) =>
			logger.warn('GameSocket', `Disconnected. Reason: ${reason}`),
		);
		this.socket.on("reconnect_attempt", (attempt) =>
			logger.debug('GameSocket', `Reconnect attempt #${attempt}...`),
		);
		this.socket.on("reconnect", (attempt) =>
			logger.log('GameSocket', `Reconnected after ${attempt} attempts`),
		);
		this.socket.on("reconnect_error", (error) =>
			logger.error('GameSocket', `Reconnect error: ${error.message}`),
		);
		this.socket.on("reconnect_failed", () =>
			logger.error('GameSocket', 'Reconnection totally failed.'),
		);
		this.socket.on("connect_error", (err) => {
			logger.error('GameSocket', `Connect error: ${err.message}`);
		});

		this.socket.on("exception", async (data: { status: string; errorCode: string; message: string }) => {
			logger.error('GameSocket', `Exception from server: [${data.errorCode}] ${data.message}`);

			if (data.errorCode === "UNAUTHORIZED_TOKEN") {
				logger.debug('GameSocket', 'Token expired, attempting refresh...');
				const refreshed = await refreshToken();
				if (refreshed) {
					logger.log('GameSocket', 'Token refreshed, reconnecting...');
					this.socket?.disconnect();
					this.socket?.connect();
				} else {
					logger.error('GameSocket', 'Refresh failed, bubbling to handler.');
					this.onGameError?.(data.errorCode, data.message);
				}
				return;
			}

			if (data.errorCode === "INVALID_INPUT") {
				logger.warn('GameSocket', `Invalid input: ${data.message}`);
				return;
			}

			this.onGameError?.(data.errorCode, data.message);
		});

		return this.socket;
	}

	disconnect() {
		if (this.socket) {
			logger.log('GameSocket', 'Manual disconnect triggered.');
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
			this.listenerMap.clear();
		}
	}

	isConnected(): boolean {
		return !!this.socket?.connected;
	}

	emit(event: GameEvents, data?: unknown, ack?: (response: AckResponse) => void) {
		if (!this.socket?.connected) {
			logger.error('GameSocket', `Cannot emit '${event}': not connected.`);
			return;
		}
		if (event !== GameEvents.INPUT) {
			logger.debug('GameSocket', `Emitting [${event}]:`, data);
		}
		if (ack) {
			this.socket.emit(event, data, ack);
		} else {
			this.socket.emit(event, data);
		}
	}

	on<T = unknown>(event: GameEvents, callback: (data: T) => void): void {
		if (!this.socket) return;
		const wrapper = (data: unknown) => {
			if (event !== GameEvents.GAME_STATE) {
				logger.debug('GameSocket', `Received [${event}]:`, data);
			}
			callback(data as T);
		};
		this.listenerMap.set(callback as unknown as (data: unknown) => void, wrapper);
		this.socket.on(event, wrapper);
	}

	off<T = unknown>(event: GameEvents, callback?: (data: T) => void): void {
		if (!this.socket) return;
		if (callback) {
			const key = callback as unknown as (data: unknown) => void;
			const wrapper = this.listenerMap.get(key);
			if (wrapper) {
				this.socket.off(event, wrapper);
				this.listenerMap.delete(key);
			}
		} else {
			this.socket.off(event);
		}
		logger.debug('GameSocket', `Removing listener for [${event}]`);
	}
}

export const socketService = new SocketService();
