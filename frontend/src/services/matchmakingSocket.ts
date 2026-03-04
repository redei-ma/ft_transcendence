import { io, Socket } from 'socket.io-client';
import { GameEvents } from '../game/game.events';

class MatchmakingSocket {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('http://localhost', {
      path: "/matchmaking_api/socket.io",
      transports: ['websocket'],
      reconnection: false, // se si disconnette = leave queue
    });

    this.socket.on('connect', () => {
      console.log('[Matchmaking] Connected. Socket ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Matchmaking] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Matchmaking] Connection error:', error.message);
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
    if (!this.socket) {
      console.error('[Matchmaking] Cannot emit: not connected.');
      return;
    }
    this.socket.emit(event, data);
  }

  on(event: GameEvents | string, callback: (data: any) => void) {
    if (!this.socket) {
      console.error('[Matchmaking] Cannot listen: not connected.');
      return;
    }
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