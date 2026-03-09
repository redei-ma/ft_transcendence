import { io, Socket } from "socket.io-client";
import * as msgpackParser from "socket.io-msgpack-parser";
import { GameEvents } from "../game/game.events";
import { refreshToken } from "../site/services/authService";

export class SocketService {
	private socket: Socket | null = null;

	public getSocket(): Socket | null {
		return this.socket;
	}

	connect(url: string, userDbId?: string): Socket {
		if (this.socket?.connected) {
			console.log("🔵 [GameSocket] Already connected.");
			return this.socket;
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

		// --- LIFECYCLE EVENTS ---
		this.socket.on("connect", () =>
			console.log(
				`🟢 [GameSocket] Connected! Socket ID: ${this.socket?.id}`,
			),
		);
		this.socket.on("disconnect", (reason) =>
			console.warn(`🔴 [GameSocket] Disconnected. Reason: ${reason}`),
		);

		// --- RECONNECTION EVENTS ---
		this.socket.on("reconnect_attempt", (attempt) =>
			console.log(`🔄 [GameSocket] Reconnect attempt #${attempt}...`),
		);
		this.socket.on("reconnect", (attempt) =>
			console.log(
				`✅ [GameSocket] Reconnected successfully after ${attempt} attempts`,
			),
		);
		this.socket.on("reconnect_error", (error) =>
			console.error(`❌ [GameSocket] Reconnect error:`, error.message),
		);
		this.socket.on("reconnect_failed", () =>
			console.error(`💀 [GameSocket] Reconnection totally failed.`),
		);

		this.socket.on("connect_error", async (err) => {
			console.error(`❌ [GameSocket] Connect Error:`, err.message);
			if (
				err.message === "unauthorized" ||
				err.message === "Authentication error"
			) {
				console.log("🔄 [GameSocket] Attempting token refresh...");
				const refreshed = await refreshToken();
				if (refreshed) {
					console.log(
						"✅ [GameSocket] Token refreshed, reconnecting...",
					);
					this.socket?.connect();
				} else {
					console.error("🚫 [GameSocket] Token refresh failed.");
				}
			}
		});

		this.socket.on("unauthorized", async () => {
			console.warn("🔐 [GameSocket] Unauthorized event received.");
			const refreshed = await refreshToken();
			if (refreshed) {
				console.log("🔄 [GameSocket] Reconnecting after auth fix...");
				this.socket?.connect();
			}
		});

		return this.socket;
	}

	disconnect() {
		if (this.socket) {
			console.log("🟠 [GameSocket] Manual disconnect triggered.");
			this.socket.disconnect();
			this.socket = null;
		}
	}

	emit(event: GameEvents, data?: any) {
		if (!this.socket) {
			console.error(
				`⚠️ [GameSocket] Cannot emit '${event}': not connected.`,
			);
			return;
		}

		// FILTRO ANTI-SPAM: Non logghiamo gli input fisici (viaggiano 20 volte al secondo)
		if (event !== GameEvents.INPUT) {
			console.log(`↗️ [GameSocket] Emitting [${event}]:`, data);
		}

		this.socket.emit(event, data);
	}

	on(event: GameEvents, callback: (data: any) => void) {
		if (!this.socket) return;

		// Wrappiamo la callback per intercettare i dati in arrivo
		this.socket.on(event, (data) => {
			// FILTRO ANTI-SPAM: Non logghiamo il GAME_STATE (arriva 16 volte al secondo)
			if (event !== GameEvents.GAME_STATE) {
				console.log(`↙️ [GameSocket] Received [${event}]:`, data);
			}
			callback(data);
		});
	}

	off(event: GameEvents, callback?: (data: any) => void) {
		if (!this.socket) return;
		console.log(`🔇 [GameSocket] Removing listener for [${event}]`);
		this.socket.off(event, callback);
	}
}
export const socketService = new SocketService();
