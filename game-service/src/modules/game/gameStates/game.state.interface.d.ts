import { Logger } from "@nestjs/common";
import { Vector } from "../utils/game.vector";
import { AttackType } from "@transcendence/types";
export interface IGameState {
    logger: Logger;
    name: string;
    onEnter(): void;
    update(dt: number): void;
    onInput(entityId: string, input: Vector, attackType: AttackType): void;
    onExit(): void;
}
//# sourceMappingURL=game.state.interface.d.ts.map