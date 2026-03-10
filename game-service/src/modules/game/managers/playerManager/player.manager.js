"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerManager = void 0;
const common_1 = require("@nestjs/common");
const player_factory_1 = require("../../factories/player.factory");
const systems_1 = require("../../systems");
const utils_1 = require("../../utils");
const __1 = require("..");
const types_1 = require("@transcendence/types");
let PlayerManager = class PlayerManager {
    constructor(physicsSystem, combatSystem) {
        this.physicsSystem = physicsSystem;
        this.combatSystem = combatSystem;
    }
    updateAllPlayers(players, gameWorld, dt) {
        players.forEach(player => {
            this.playerRoutine(player, dt, players, gameWorld);
        });
    }
    playerRoutine(player, dt, players, gameWorld) {
        this.combatSystem.updateCooldowns(player, dt);
        if (player.isDead) {
            player.respawnTimer += dt;
            if (player.respawnTimer >= types_1.GameConfig.PLAYER.RESPAWN_TIMER) {
                this.respawnPlayer(player, gameWorld);
            }
        }
        else if (player.isDisconnected) {
            player.disconnectionTimer += dt;
            if (player.disconnectionTimer >= types_1.GameConfig.SERVER.MAX_DISCONNECTION_TIMER) {
                players.delete(player.entityId);
            }
        }
        else {
            this.updateSinglePlayer(player, gameWorld, players, dt);
        }
    }
    updateSinglePlayer(player, gameWorld, players, dt) {
        //if (player.isBot){
        //this.AiService.updateInput(player, gameWorld, players, dt);
        //metodo che manda al collega lo stato attuale del mondo e aggiorna la queue di input del bot
        //}
        if (player.isDead)
            return;
        if (player.currentState) {
            const hasFinished = player.currentState.update(player, dt);
            if (hasFinished) {
                player.currentState = undefined;
            }
        }
        player.displacement.set(0, 0);
        let lastInput = undefined;
        /* I count the inputs that are processed, if they are >= MAX_INPUT_FOR_TICK, i break the loop for avoid cheater and more security */
        let inputProcessed = 0;
        for (const currentInput of player.inputQueue.values()) {
            lastInput = currentInput;
            if (inputProcessed >= types_1.GameConfig.SERVER.MAX_INPUT_FOR_TICK)
                break;
            /* Math.atan2 calculates the rotation angle in radians based on direction */
            if (currentInput.input.x !== 0 || currentInput.input.z !== 0) {
                player.rotation = currentInput.input.getRotation();
            }
            if (currentInput.attackType) {
                this.updateAttackState(currentInput, player, players, gameWorld);
            }
            inputProcessed++;
        }
        if (lastInput)
            this.applyMovement(lastInput, player);
        if (player.displacement.x !== 0.0 || player.displacement.z !== 0.0) {
            this.physicsSystem.calculatePhysics(player, players, gameWorld, dt);
        }
        if (player.isGhost) {
            const overlappingPosition = this.physicsSystem.isPlayerCollision(player.entityId, player.position, player.radius, players.values());
            if (!overlappingPosition) {
                player.isGhost = false;
            }
        }
        player.inputQueue = [];
    }
    applyMovement(lastInput, player) {
        /* Update the displacement vector */
        player.displacement.set(lastInput.input.x, lastInput.input.z);
        /* Math.atan2 calculates the rotation angle in radians based on direction */
        if (lastInput.input.x !== 0 || lastInput.input.z !== 0) {
            player.rotation = lastInput.input.getRotation();
        }
    }
    respawnPlayer(player, gameWorld) {
        player.hp = types_1.GameConfig.PLAYER.DEFAULT_HP;
        player.isDead = false;
        player.isGhost = true;
        player.position = new utils_1.Vector(gameWorld.spawnPoints[player.spawnIndex].x, gameWorld.spawnPoints[player.spawnIndex].z);
        player.respawnTimer = 0;
        player.meleeAttackCooldown = player_factory_1.CHARACTER_DATA[player.characterName].COOLDOWN_MELEE_ATTACK;
        player.spellAttackCooldown = player_factory_1.CHARACTER_DATA[player.characterName].COOLDOWN_SPELL_ATTACK;
    }
    updateAttackState(currentInput, player, players, gameWorld) {
        const stats = player_factory_1.CHARACTER_DATA[player.characterName];
        player.attackType = currentInput.attackType;
        if (currentInput.attackType === types_1.AttackType.MELEE_ATTACK &&
            player.meleeAttackCooldown >= stats.COOLDOWN_MELEE_ATTACK &&
            !player.currentState) {
            player.currentState = new __1.MeleeAttackState(this.combatSystem, players);
            player.currentState.onEnter(player);
        }
        else if (currentInput.attackType === types_1.AttackType.SPELL_ATTACK &&
            player.spellAttackCooldown >= stats.COOLDOWN_SPELL_ATTACK &&
            !player.currentState) {
            player.currentState = new __1.SpellAttackState(this.combatSystem, gameWorld);
            player.currentState.onEnter(player);
        }
        else if (currentInput.attackType === types_1.AttackType.DEFENCE_ATTACK &&
            player.defenceAttackCooldown >= stats.COOLDOWN_DEFENCE_ATTACK &&
            !player.currentState) {
            player.currentState = new __1.DefenceAttack();
            player.currentState.onEnter(player);
        }
    }
};
exports.PlayerManager = PlayerManager;
exports.PlayerManager = PlayerManager = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [systems_1.PhysicsSystem, systems_1.CombatSystem])
], PlayerManager);
