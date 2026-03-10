import { Logger } from "@nestjs/common";
import { AttackType } from "@transcendence/types";
import { GameSession } from "../core/game.session";
import { Vector } from "../utils/game.vector";
import { IGameState } from "./game.state.interface";
export declare class EndState implements IGameState {
    private readonly session;
    logger: Logger;
    name: string;
    private shutdownTimer;
    isReadyToClose: boolean;
    constructor(session: GameSession);
    onEnter(): void;
    update(dt: number): void;
    onInput(entityId: string, input: Vector, attackType: AttackType): void;
    onExit(): void;
}
//# sourceMappingURL=endState.d.ts.map