import { io, Socket } from "socket.io-client";
import * as msgpackParser from "socket.io-msgpack-parser";
import { GameEvents } from '@transcendence/types';
import { refreshToken } from "../site/services/authService";

export class SocketService {
	private socket: Socket | null = null;
	private listenerMap = new Map<(data: any) => void, (data: any) => void>();

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
				console.log("🔵 [GameSocket] Already connected.");
				return this.socket;
			}
			// Socket esiste ma non connesso → cleanup prima di ricreare
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
			this.listenerMap.clear();
		}

		console.log(
			`🟡 [GameSocket] Initiating connection for UserDB ID: ${userDbId || "None"}...`,
		);
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
			console.log(`🟢 [GameSocket] Connected! Socket ID: ${this.socket?.id}`),
		);
		this.socket.on("disconnect", (reason) =>
			console.warn(`🔴 [GameSocket] Disconnected. Reason: ${reason}`),
		);
		this.socket.on("reconnect_attempt", (attempt) =>
			console.log(`🔄 [GameSocket] Reconnect attempt #${attempt}...`),
		);
		this.socket.on("reconnect", (attempt) =>
			console.log(`✅ [GameSocket] Reconnected successfully after ${attempt} attempts`),
		);
		this.socket.on("reconnect_error", (error) =>
			console.error(`❌ [GameSocket] Reconnect error:`, error.message),
		);
		this.socket.on("reconnect_failed", () =>
			console.error(`💀 [GameSocket] Reconnection totally failed.`),
		);
		this.socket.on("connect_error", (err) => {
  			console.error(`❌ [GameSocket] Connect Error:`, err.message);
		});

		this.socket.on("exception", async (data: { status: string; errorCode: string; message: string }) => {
			console.error(`🚨 [GameSocket] Exception from server: [${data.errorCode}] ${data.message}`);
			switch (data.errorCode) {
				case "UNAUTHORIZED_TOKEN":
			      	console.log("🔄 [GameSocket] Token expired, attempting refresh...");
      				const refreshed = await refreshToken();
      				if (refreshed) {
        				console.log("✅ [GameSocket] Token refreshed, reconnecting...");
        				this.socket?.disconnect();
        				this.socket?.connect();
      				} else {
        				console.error("🚫 [GameSocket] Refresh failed, bubbling to handler.");
        				this.onGameError?.(data.errorCode, data.message);
      				}
					break;
				case "UNAUTHORIZED":
					
					break;
				case "PLAYER_NOT_FOUND":
					break;
				case "SESSION_NOT_FOUND":
					break;
				case "MATCH_ALREADY_STARTED":
					break;
				case "SERVER_SHUTDOWN":
					break;
				case "INVALID_INPUT":
					break;
				default:
				    console.warn(`[GameSocket] Unhandled error code: ${data.errorCode}`);
				    this.onGameError?.(data.errorCode, data.message);
				    break;
			}
		});

		return this.socket;
	}

	disconnect() {
			if (this.socket) {
			console.log("🟠 [GameSocket] Manual disconnect triggered.");
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
			this.listenerMap.clear();
		}
	}

	emit(event: GameEvents, data?: any) {
		if (!this.socket) {
			console.error(`⚠️ [GameSocket] Cannot emit '${event}': socket is null.`);
			return;
		}
		if (event !== GameEvents.INPUT) {
			console.log(`↗️ [GameSocket] Emitting [${event}]:`, data);
		}
		this.socket.emit(event, data);
	}

	on(event: GameEvents, callback: (data: any) => void) {
		if (!this.socket) return;
		const wrapper = (data: any) => {
			if (event !== GameEvents.GAME_STATE) {
				console.log(`↙️ [GameSocket] Received [${event}]:`, data);
			}
			callback(data);
		};
		this.listenerMap.set(callback, wrapper);
		this.socket.on(event, wrapper);
	}

	off(event: GameEvents, callback?: (data: any) => void) {
		if (!this.socket) return;
		if (callback) {
			const wrapper = this.listenerMap.get(callback);
			if (wrapper) {
				this.socket.off(event, wrapper);
				this.listenerMap.delete(callback);
			}
		} else {
			this.socket.off(event);
		}
		console.log(`🔇 [GameSocket] Removing listener for [${event}]`);
	}
	
}

export const socketService = new SocketService();