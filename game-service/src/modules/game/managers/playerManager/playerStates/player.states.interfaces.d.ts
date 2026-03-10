import { Player } from "@transcendence/types";
export interface IPlayerState {
    onEnter(player: Player): void;
    update(player: Player, dt: number): boolean;
}
//# sourceMappingURL=player.states.interfaces.d.ts.map