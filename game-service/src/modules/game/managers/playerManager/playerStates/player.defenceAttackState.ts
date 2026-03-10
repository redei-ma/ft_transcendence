import { GameConfig, Player, IPlayerState } from "@transcendence/types";

export class DefenceAttack implements IPlayerState{

	private timer: number = 0;
	private duration: number = GameConfig.COMBAT.DEFENCE_DURATION;

	onEnter(player: Player) {
		player.isDefending = true;
		player.defenceAttackCooldown = 0;
	}
	update(player: Player, dt: number) {
		this.timer += dt;

		if (this.timer >= this.duration){
			player.isDefending = false;
			return (true);
		}
		return (false);
	}
}