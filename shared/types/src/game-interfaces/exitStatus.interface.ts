import { ErrorCode, SuccessCode } from "../enums";

export interface ExitStatus{
    status: ErrorCode | SuccessCode,
    message?: string,
}