// frontend/src/services/socketServices.ts
import { io, Socket } from 'socket.io-client';
import { GameEvents } from '../game/game.events';
import { refreshToken } from '../site/services/authService';

export class SocketService {
    private socket: Socket | null = null;

    public getSocket(): Socket | null {
        return this.socket;
    }

    connect(url: string, userDbId?: string): Socket {
        if (this.socket?.connected) {
            console.log('Already connected.');
            return this.socket;
        }

        this.socket = io(url, {
            path: "/game_api/socket.io",
            transports: ['websocket', 'polling'],
            withCredentials: true,                // FONDAMENTALE PER IL JWT
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            query: userDbId ? { userDbId } : {},
        });

        this.socket.on('connect', () => {
            console.log('✅ Game Socket connected:', this.socket?.id);
        });

        // Logica di Ale per l'autenticazione
        this.socket.on("unauthorized", async () => {
            console.warn("🔐 Game Socket unauthorized");
            const refreshed = await refreshToken();
            if (refreshed) {
                console.log("🔄 Reconnecting Game socket");
                this.socket?.connect();
            } else {
                console.warn("🚪 Auth failed, cannot connect socket");
                // Qui potresti triggerare un logout visivo
            }
        });

        // Alcuni backend emettono connect_error invece di unauthorized
        this.socket.on('connect_error', async (err) => {
            console.warn('⚠️ Game Socket connect error:', err.message);
            if (err.message === "unauthorized" || err.message === "Authentication error") {
                const refreshed = await refreshToken();
                if (refreshed) this.socket?.connect();
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Game Socket disconnected:', reason);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('Socket was disconnected');
        }
    }

    emit(event: GameEvents, data?: any) {
        if (!this.socket) {
            console.error('Cannot emit: socket not connected.');
        }
        this.socket?.emit(event, data);
    }

    on(event: GameEvents, callback: (data: any) => void) {
        if (!this.socket) return;
        this.socket.on(event, callback);
    }

    off(event: GameEvents, callback?: (data: any) => void) {
        if (!this.socket) return;
        this.socket.off(event, callback);
    }
}
export const socketService = new SocketService();