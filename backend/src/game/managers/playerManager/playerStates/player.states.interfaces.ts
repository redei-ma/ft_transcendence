import { Player } from "../../../interfaces-enums";

export interface IPlayerState{

	onEnter(player: Player): void;

	update(player: Player, dt: number): boolean;
}