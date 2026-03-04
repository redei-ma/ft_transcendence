import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerException } from "@nestjs/throttler";
import { GameException } from "../errorHandling/game.exception";
import { ErrorCode } from "../interfaces-enums";
import { SocketEvents } from "../configs";

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {

    protected getRequestResponse(context: ExecutionContext) {
        const client = context.switchToWs().getClient();
        return { req: client, res: {} };
    }

	protected async getTracker(req: Record<string, any>): Promise<string> {
        if (req.isAiPlayer) {
            return `AI_${req.id}`;
        }
        return req.conn?.remoteAddress || req._socket?.remoteAddress || req.id;
    }

    async handleRequest(requestProps: any): Promise<boolean> {
        const context = requestProps.context;
        const eventName = context.switchToWs().getPattern();

        if (eventName === SocketEvents.INPUT) {
            return true; 
        }

        try {
            return await super.handleRequest(requestProps);
        } catch (error) {
            if (error instanceof ThrottlerException || error.name === 'ThrottlerException') {
                throw new GameException(
                    ErrorCode.INVALID_INPUT, 
                    "too many message",
                );
            }
            throw error;
        }
    }
}