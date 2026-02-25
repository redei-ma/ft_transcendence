import { ArgumentsHost, Catch } from "@nestjs/common";
import { BaseWsExceptionFilter, WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { GameException } from "./game.exception"; 

@Catch()
export class GameExceptionFilter extends BaseWsExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {

		if (host.getType() !== 'ws') return;

		const client = host.switchToWs().getClient<Socket>();

		if (exception instanceof GameException) {
			const errorPayload = exception.getError() as any;
			client.emit('exception', { 
				status: 'error', 
				errorCode: errorPayload.code,
				message: errorPayload.message,
			});
		}
		else if (exception instanceof Error || exception instanceof WsException) {
			client.emit('exception', { 
				status: 'error', 
				errorCode: 'GENERIC_ERROR',
				message: exception.message,
			});
		} 
		else {
			client.emit('exception', { 
				status: 'error', 
				errorCode: 'UNKNOWN_ERROR',
				message: 'Internal server error',
			});
		}
		
		super.catch(exception, host);
	}
}