import { WsException } from "@nestjs/websockets";
import { ErrorCode } from "./interfaces-enums";

export class GameException extends WsException{
	constructor(public readonly code: ErrorCode, message?: string) {
		super({ code, message: message || 'Game error'});
	}
}