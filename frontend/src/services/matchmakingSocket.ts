import { io, Socket } from "socket.io-client";
import { GameEvents } from "../game/game.events";
import { refreshToken } from "../site/services/authService";

class MatchmakingSocket {
	private socket: Socket | null = null;

	connect(): Socket {
		if (this.socket?.connected) {
			console.log("🔵 [Matchmaking] Already connected.");
			return this.socket;
		}

		console.log("🟡 [Matchmaking] Initiating connection...");
		this.socket = io("/", {
			path: "/ws/matchmaking/socket.io",
			transports: ["websocket", "polling"],
			withCredentials: true,
			reconnection: false, // Se cade, esce dalla coda
		});

		// --- LIFECYCLE EVENTS ---
		this.socket.on("connect", () =>
			console.log(
				`🟢 [Matchmaking] Connected! Socket ID: ${this.socket?.id}`,
			),
		);
		this.socket.on("disconnect", (reason) =>
			console.warn(`🔴 [Matchmaking] Disconnected. Reason: ${reason}`),
		);

		this.socket.on("connect_error", async (error) => {
			console.error(`❌ [Matchmaking] Connection Error:`, error.message);
			if (
				error.message === "unauthorized" ||
				error.message === "Authentication error"
			) {
				console.log("🔄 [Matchmaking] Attempting token refresh...");
				const refreshed = await refreshToken();
				if (refreshed) {
					console.log(
						"✅ [Matchmaking] Token refreshed, reconnecting...",
					);
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

		return this.socket;
	}

	disconnect() {
		if (this.socket) {
			console.log(
				"🟠 [Matchmaking] Manual disconnect triggered (Left queue).",
			);
			this.socket.disconnect();
			this.socket = null;
		}
	}

	emit(event: GameEvents, data?: any) {
		if (!this.socket) {
			console.error(
				`⚠️ [Matchmaking] Cannot emit '${event}': not connected.`,
			);
			return;
		}
		console.log(`↗️ [Matchmaking] Emitting [${event}]:`, data);
		this.socket.emit(event, data);
	}

	on(event: GameEvents | string, callback: (data: any) => void) {
		if (!this.socket) return;

		// Wrappiamo la callback per intercettare e loggare i dati in arrivo
		this.socket.on(event, (data) => {
			console.log(`↙️ [Matchmaking] Received [${event}]:`, data);
			callback(data);
		});
	}

	off(event: GameEvents | string, callback?: (data: any) => void) {
		if (!this.socket) return;
		console.log(`🔇 [Matchmaking] Removing listener for [${event}]`);
		this.socket.off(event, callback);
	}

	getSocket(): Socket | null {
		return this.socket;
	}
}

export const matchmakingSocket = new MatchmakingSocket();
