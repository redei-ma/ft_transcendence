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

// Singleton che gestisce il socket WebSocket di gioco (path /ws/game/socket.io).
// Usa il parser msgpack per ridurre il payload degli snapshot ad alta frequenza.
export class SocketService {
	private socket: Socket | null = null;
	// Mappa callback originali → wrapper con logging: necessaria per poter chiamare off() con la stessa referenza
	private listenerMap = new Map<(data: unknown) => void, (data: unknown) => void>(); // Map: struttura O(1) per lookup — socket.off() richiede la referenza ESATTA della funzione passata a on()

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
			// Pulisce listener e stato prima di riconnettersi
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
			this.listenerMap.clear();
		}

		logger.log('GameSocket', `Initiating connection for UserDB ID: ${userDbId ?? 'None'}...`);
		this.socket = io(url, {
			path: "/ws/game/socket.io",
			transports: ["websocket", "polling"],
			parser: msgpackParser,         // msgpack: più compatto di JSON per snapshot frequenti
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

		// Evento centralizzato per gli errori lato server: gestisce token scaduto con refresh automatico
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

	// Registra un listener wrappandolo in un logger; salva la coppia originale→wrapper per poter fare off() corretto
	on<T = unknown>(event: GameEvents, callback: (data: T) => void): void {
		if (!this.socket) return;
		const wrapper = (data: unknown) => {
			if (event !== GameEvents.GAME_STATE) {
				logger.debug('GameSocket', `Received [${event}]:`, data);
			}
			callback(data as T);
		};
		this.listenerMap.set(callback as unknown as (data: unknown) => void, wrapper); // chiave=callback originale, valore=wrapper — per recuperarlo in off()
		this.socket.on(event, wrapper); // il socket ascolta il wrapper, non la callback originale
	}

	// Rimuove il listener recuperando il wrapper dalla map (necessario perché socket.off richiede la stessa referenza)
	off<T = unknown>(event: GameEvents, callback?: (data: T) => void): void {
		if (!this.socket) return;
		if (callback) {
			const key = callback as unknown as (data: unknown) => void;
			const wrapper = this.listenerMap.get(key); // lookup O(1): recupera il wrapper registrato per questa callback
			if (wrapper) {
				this.socket.off(event, wrapper); // CRITICO: socket.off con referenza diversa dal wrapper è un no-op silenzioso → memory leak
				this.listenerMap.delete(key);
			}
		} else {
			this.socket.off(event);
		}
		logger.debug('GameSocket', `Removing listener for [${event}]`);
	}
}

// Istanza singleton: condivisa da Game.tsx, useGameSocket e GameChat
export const socketService = new SocketService();
