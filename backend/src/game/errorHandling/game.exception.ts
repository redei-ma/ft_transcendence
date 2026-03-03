import { WsException } from "@nestjs/websockets";
import { ErrorCode } from "../interfaces-enums";

export class GameException extends WsException{
	constructor(public readonly code: ErrorCode, public readonly message: string = 'Game error') {
		super({ code, message});
	}
}