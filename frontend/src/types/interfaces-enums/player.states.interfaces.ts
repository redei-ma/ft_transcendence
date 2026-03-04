import { Player } from ".";

export interface IPlayerState{

	onEnter(player: Player): void;

	update(player: Player, dt: number): void;
}