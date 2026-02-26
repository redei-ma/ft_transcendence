import { io, Socket } from 'socket.io-client';
import { GameEvents } from '../game/game.events';

export class SocketService {
    
    private socket: Socket | null = null;

    public getSocket(): Socket | null {
        return this.socket;
    }
    connect(url: string, userDbId?: string): Socket{
        if (this.socket?.connected){
            console.log('Already connected.');
            return this.socket;
        }
        this.socket = io(url, {
            path: "/game_api/socket.io",
            transports: ['websocket'],
            reconnection:   true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            query: userDbId ? { userDbId } : {},
        });
        this.socket.on('connect', () => {
            console.log('Connected. Socket ID is: ', this.socket?.id);
        });
        this.socket.on('disconnect', (reason) =>{
            console.log('Disconnected: ', reason);
        });
        this.socket.on('connect_error', (error) =>{
            console.error('Connection error: ', error.message);
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

    emit(event: GameEvents, data?: any){
        if (!this.socket) {
            console.error('Cannot emit: socket not connected.');
        }
        this.socket?.emit(event, data);
    }

    on(event: GameEvents, callback: (data: any) => void) {
        if (!this.socket) {
            console.error('Cannot listen: socket not connected.');
            return;
        }
        this.socket.on(event, callback);
    }

    off(event: GameEvents, callback?: (data: any) => void) {
        if (!this.socket) return;
        this.socket.off(event, callback)
    }

};
export const socketService = new SocketService();
