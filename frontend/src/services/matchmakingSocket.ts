// frontend/src/services/matchmakingSocket.ts
import { io, Socket } from 'socket.io-client';
import { GameEvents } from '../game/game.events';
import { refreshToken } from '../site/services/authService';

class MatchmakingSocket {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io('/', { 
      path: "/matchmaking_api/socket.io",
      transports: ['websocket', 'polling'],
      withCredentials: true, // FONDAMENTALE PER IL JWT
      reconnection: false,
    });

    this.socket.on('connect', () => {
      console.log('✅ [Matchmaking] Connected. Socket ID:', this.socket?.id);
    });

    // Logica di Ale
    this.socket.on("unauthorized", async () => {
        console.warn("🔐 [Matchmaking] Socket unauthorized");
        const refreshed = await refreshToken();
        if (refreshed) {
            console.log("🔄 Reconnecting Matchmaking socket");
            this.socket?.connect();
        }
    });

    this.socket.on('connect_error', async (error) => {
      console.warn('⚠️ [Matchmaking] Connection error:', error.message);
      if (error.message === "unauthorized" || error.message === "Authentication error") {
          const refreshed = await refreshToken();
          if (refreshed) this.socket?.connect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [Matchmaking] Disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Matchmaking] Socket closed (left queue)');
    }
  }

  emit(event: GameEvents, data?: any) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  on(event: GameEvents | string, callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event: GameEvents | string, callback?: (data: any) => void) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const matchmakingSocket = new MatchmakingSocket();