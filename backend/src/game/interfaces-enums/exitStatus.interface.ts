import { ErrorCode, SuccessCode } from "./game.enums";

export interface ExitStatus{
    status: ErrorCode | SuccessCode,
    message?: string,
}