import { Injectable } from "@nestjs/common";
import { CHARACTER_DATA } from "../../factories";
import { CombatSystem, PhysicsSystem } from "../../systems";
import { World } from "../../core";
import { SpellAttackState, MeleeAttackState, DefenceAttack } from "..";
import { Vector, GameConfig, Player, InputQueue, AttackType } from "@transcendence/types";
import { AiService } from "../../core";

@Injectable()
export class PlayerManager{

	constructor(private readonly physicsSystem: PhysicsSystem, private readonly combatSystem: CombatSystem, private readonly aiService: AiService) {}

	updateAllPlayers(players: Map<string, Player>, gameWorld: World, dt: number){
		players.forEach(player => {
			this.playerRoutine(player, dt, players, gameWorld);
		});
	}

	private playerRoutine(player: Player, dt: number, players: Map<string, Player>, gameWorld: World): void{
		this.combatSystem.updateCooldowns(player, dt);
		if (player.isDead){
			player.respawnTimer += dt;
			if (player.respawnTimer >= GameConfig.PLAYER.RESPAWN_TIMER){
				this.respawnPlayer(player, gameWorld);
			}
		}
		else if (player.isDisconnected){
			player.disconnectionTimer += dt;
			if (player.disconnectionTimer >= GameConfig.SERVER.MAX_DISCONNECTION_TIMER){
				players.delete(player.entityId);
			}
		}
		else{
			this.updateSinglePlayer(player, gameWorld, players, dt);
		}
	}

	updateSinglePlayer(player: Player, gameWorld: World, players: Map<string, Player>, dt: number){
		if (player.isBot){
			this.aiService.updateInput(player, gameWorld, players ,dt);
			//metodo che manda al collega lo stato attuale del mondo e aggiorna la queue di input del bot
		}

		if (player.isDead) return;

		if (player.currentState){
			const hasFinished: boolean = player.currentState.update(player, dt);
			if (hasFinished){
				player.currentState = undefined;
			}
		}

		player.displacement.set(0,0);
		let lastInput: InputQueue | undefined = undefined;

		/* I count the inputs that are processed, if they are >= MAX_INPUT_FOR_TICK, i break the loop for avoid cheater and more security */
		let inputProcessed: number = 0;

		for (const currentInput of player.inputQueue.values()){
			lastInput = currentInput;
			if (inputProcessed >= GameConfig.SERVER.MAX_INPUT_FOR_TICK)
				break;
			/* Math.atan2 calculates the rotation angle in radians based on direction */
			if (currentInput.input.x !== 0 || currentInput.input.z !== 0){
				player.rotation = currentInput.input.getRotation();
			}
			if (currentInput.attackType){
				this.updateAttackState(currentInput, player, players, gameWorld);
			}
			inputProcessed++;
		}

		if (lastInput)
			this.applyMovement(lastInput, player);

		if (player.displacement.x !== 0.0 || player.displacement.z !== 0.0){
			this.physicsSystem.calculatePhysics(player, players, gameWorld, dt);
		}

		if (player.isGhost){
			const overlappingPosition: Player | undefined = this.physicsSystem.isPlayerCollision(player.entityId, player.position, player.radius, players.values());
			if (!overlappingPosition){
				player.isGhost = false;
			}
		}
		player.inputQueue = [];
	}

	private applyMovement(lastInput: InputQueue, player: Player): void{

		/* Update the displacement vector */
		player.displacement.set(lastInput.input.x, lastInput.input.z);
		/* Math.atan2 calculates the rotation angle in radians based on direction */

		if (lastInput.input.x !== 0 || lastInput.input.z !== 0){
			player.rotation = lastInput.input.getRotation();
		}
	}

	private respawnPlayer(player: Player, gameWorld: World): void{
		player.hp = GameConfig.PLAYER.DEFAULT_HP;
		player.isDead = false;
		player.isGhost = true;
		player.position = new Vector(gameWorld.spawnPoints[player.spawnIndex].x, gameWorld.spawnPoints[player.spawnIndex].z);
		player.respawnTimer = 0;
		player.meleeAttackCooldown = CHARACTER_DATA[player.characterName].COOLDOWN_MELEE_ATTACK;
		player.spellAttackCooldown = CHARACTER_DATA[player.characterName].COOLDOWN_SPELL_ATTACK;
	}

	private updateAttackState(currentInput: InputQueue, player: Player, players: Map<string, Player>, gameWorld: World): void{
		const stats = CHARACTER_DATA[player.characterName];
		player.attackType = currentInput.attackType;

		if (currentInput.attackType === AttackType.MELEE_ATTACK &&
			player.meleeAttackCooldown >= stats.COOLDOWN_MELEE_ATTACK &&
			!player.currentState){
			player.currentState = new MeleeAttackState(this.combatSystem, players);
			player.currentState.onEnter(player);
		}

		else if (currentInput.attackType === AttackType.SPELL_ATTACK &&
			player.spellAttackCooldown >= stats.COOLDOWN_SPELL_ATTACK &&
			!player.currentState){
				player.currentState = new SpellAttackState(this.combatSystem, gameWorld);
				player.currentState.onEnter(player);
		}

		else if (currentInput.attackType === AttackType.DEFENCE_ATTACK &&
			player.defenceAttackCooldown >= stats.COOLDOWN_DEFENCE_ATTACK &&
			!player.currentState
		){
			player.currentState = new DefenceAttack();
			player.currentState.onEnter(player);
		}

	}
}