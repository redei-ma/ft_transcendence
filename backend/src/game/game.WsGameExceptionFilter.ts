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
			client.emit('exception', { 
				status: 'error', 
				errorCode: exception.code,
				message: exception.message,
			});
		}
		else if (exception instanceof Error) {
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