import { GameSession } from "../core/game.session";
import { AttackType, ExitStatus } from "../interfaces-enums";
import { Vector } from "../utils/game.vector";
import { IGameState } from "./game.state.interface";
import { Logger } from "@nestjs/common";
export declare class PlayState implements IGameState {
    private readonly session;
    logger: Logger;
    name: string;
    private fullEvents;
    constructor(session: GameSession);
    onEnter(): void;
    update(dt: number): void;
    onInput(entityId: string, input: Vector, attackType: AttackType): void;
    onExit(): void;
    reconnectPlayer(userDbId: string, socketId: string): ExitStatus;
    private resendData;
}
//# sourceMappingURL=playState.d.ts.map