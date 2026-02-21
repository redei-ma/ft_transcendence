import { ArgumentsHost, Catch } from "@nestjs/common";
import { WsArgumentsHost } from "@nestjs/common/interfaces";
import { BaseWsExceptionFilter } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Catch()
export class WsGameException extends BaseWsExceptionFilter{
    catch(exception: unknown, host: ArgumentsHost) {

        if (host.getType() !== 'ws') return ;
        
        const socket: WsArgumentsHost = host.switchToWs().getClient();
        const client = socket.getClient<Socket>();
        const data = socket.getData();

        if (exception instanceof WsGameException){
            client.emit('exception', data);
        }
        else if (exception instanceof Error){
            
        }
        super.catch(exception, host);
    }
}