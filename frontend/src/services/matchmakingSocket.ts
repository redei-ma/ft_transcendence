import { io, Socket } from "socket.io-client";
import { GameEvents } from '@transcendence/types';
import { refreshToken } from "../site/services/authService";

class MatchmakingSocket {
	private socket: Socket | null = null;
	private listenerMap = new Map<(data: any) => void, (data: any) => void>();
	private onMatchError: ((code: string, message: string) => void) | null = null;

	setOnMatchError(handler: ((code: string, message: string) => void) | null) {
		this.onMatchError = handler;
	}

	connect(): Socket {
		if (this.socket) {
			if (this.socket.connected) {
				console.log("🔵 [Matchmaking] Already connected.");
				return this.socket;
			}
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
			this.listenerMap.clear();
		}

		console.log("🟡 [Matchmaking] Initiating connection...");
		this.socket = io("/", {
			path: "/ws/matchmaking/socket.io",
			transports: ["websocket", "polling"],
			withCredentials: true,
			reconnection: false,
		});

		this.socket.on("connect", () =>
			console.log(`🟢 [Matchmaking] Connected! Socket ID: ${this.socket?.id}`),
		);
		this.socket.on("disconnect", (reason) =>
			console.warn(`🔴 [Matchmaking] Disconnected. Reason: ${reason}`),
		);

		this.socket.on("connect_error", async (error) => {
			console.error(`❌ [Matchmaking] Connection Error:`, error.message);
			if (error.message === "unauthorized" || error.message === "Authentication error") {
				console.log("🔄 [Matchmaking] Attempting token refresh...");
				const refreshed = await refreshToken();
				if (refreshed) {
					console.log("✅ [Matchmaking] Token refreshed, reconnecting...");
					this.socket?.connect();
				} else {
					console.error("🚫 [Matchmaking] Token refresh failed.");
				}
			}
		});

		this.socket.on("unauthorized", async () => {
			console.warn("🔐 [Matchmaking] Unauthorized event received.");
			const refreshed = await refreshToken();
			if (refreshed) {
				console.log("🔄 [Matchmaking] Reconnecting after auth fix...");
				this.socket?.connect();
			}
		});

		this.socket.on("exception", (data: { status: string; errorCode: string; message: string }) => {
			console.error(`🚨 [Matchmaking] Exception from server: [${data.errorCode}] ${data.message}`);
			if (this.onMatchError) {
				this.onMatchError(data.errorCode, data.message);
			}
		});

		return this.socket;
	}

	disconnect() {
		if (this.socket) {
			console.log("🟠 [Matchmaking] Manual disconnect triggered (Left queue).");
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
			this.listenerMap.clear();
		}
	}

	emit(event: GameEvents, data?: any) {
		if (!this.socket) {
			console.error(`⚠️ [Matchmaking] Cannot emit '${event}': not connected.`);
			return;
		}
		console.log(`↗️ [Matchmaking] Emitting [${event}]:`, data);
		this.socket.emit(event, data);
	}

	on(event: GameEvents | string, callback: (data: any) => void) {
		if (!this.socket) return;
		const wrapper = (data: any) => {
			console.log(`↙️ [Matchmaking] Received [${event}]:`, data);
			callback(data);
		};
		this.listenerMap.set(callback, wrapper);
		this.socket.on(event, wrapper);
	}

	off(event: GameEvents | string, callback?: (data: any) => void) {
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
		console.log(`🔇 [Matchmaking] Removing listener for [${event}]`);
	}

	getSocket(): Socket | null {
		return this.socket;
	}

	connectAndEmit(event: GameEvents, data?: any): void {
	  const socket = this.connect();
	  if (socket.connected) {
	    this.emit(event, data);
	  } else {
	    socket.once('connect', () => {
	      this.emit(event, data);
	    });
	  }
	}
}

export const matchmakingSocket = new MatchmakingSocket();