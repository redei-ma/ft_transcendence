import { GameConfig, Player, IPlayerState } from "@transcendence/types"
import { World } from "../../../core";
import { CombatSystem } from "../../../systems";

export class SpellAttackState implements IPlayerState{

	private timer: number = 0;
	private duration: number = GameConfig.COMBAT.ATTACK_VISUALIZATION;
	private hasAttacked: boolean = false;

	constructor(private readonly combatSystem: CombatSystem,
		private readonly gameWorld: World){}

	onEnter(player: Player) {
		player.isAttacking = true;
		player.spellAttackCooldown = 0;
	}

	update(player: Player, dt: number): boolean {

		this.timer += dt;

		if (this.timer >= this.duration){
			player.isAttacking = false;
			return (true);
		}

		if (!this.hasAttacked){
			this.combatSystem.handleSpellAttack(player, this.gameWorld);
			this.hasAttacked = true;
		}

		return (false);
	}
}