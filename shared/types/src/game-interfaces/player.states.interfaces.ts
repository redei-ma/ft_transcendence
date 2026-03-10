import { Player } from "../game-interfaces";

export interface IPlayerState{

	onEnter(player: Player): void;

	update(player: Player, dt: number): boolean;
}