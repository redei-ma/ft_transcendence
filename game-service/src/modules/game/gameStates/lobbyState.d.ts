import { GameSession } from "../core/game.session";
import { Vector } from "../utils/game.vector";
import { IGameState } from "./game.state.interface";
import { Logger } from "@nestjs/common";
import { AttackType, MatchMakingData, ExitStatus } from "@transcendence/types";
export declare class LobbyState implements IGameState {
    private readonly session;
    logger: Logger;
    name: string;
    startTime: number;
    constructor(session: GameSession);
    onEnter(): void;
    update(dt: number): void;
    onInput(entityId: string, input: Vector, attackType: AttackType): void;
    addPlayer(player: MatchMakingData, socketId: string | undefined): ExitStatus;
    addBot(player: MatchMakingData): ExitStatus;
    startGameIfTheLobbyIsFull(): void;
    onExit(): void;
}
//# sourceMappingURL=lobbyState.d.ts.map