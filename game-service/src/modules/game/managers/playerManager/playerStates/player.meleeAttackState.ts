import { GameConfig, Player, IPlayerState } from "@transcendence/types";
import { CombatSystem } from "../../../systems";

export class MeleeAttackState implements IPlayerState{

	private timer: number = 0;
	private duration: number = GameConfig.COMBAT.ATTACK_VISUALIZATION;
	private hasAttacked: boolean = false;

	constructor(private readonly combatSystem: CombatSystem,
		private readonly players: Map<string, Player>){}

	onEnter(player: Player) {
		player.isAttacking = true;
		player.meleeAttackCooldown = 0;
	}

	update(player: Player, dt: number): boolean {

		this.timer += dt;

		if (this.timer >= this.duration){
			player.isAttacking = false;
			return (true);
		}

		if (!this.hasAttacked){
			this.combatSystem.handleMeleeAttack(player, this.players);
			this.hasAttacked = true;
		}

		return (false);
	}
}