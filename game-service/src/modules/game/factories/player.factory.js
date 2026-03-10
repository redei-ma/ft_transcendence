"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_DATA = void 0;
exports.getNewPlayer = getNewPlayer;
const utils_1 = require("../utils");
const types_1 = require("@transcendence/types");
exports.CHARACTER_DATA = {
    [types_1.CharacterName.ZEUS]: {
        MELEE_DAMAGE: 15.0,
        SPELL_DAMAGE: 100.0,
        SPELL_SPEED: 40.0,
        COOLDOWN_MELEE_ATTACK: 0.8,
        COOLDOWN_SPELL_ATTACK: 1.5,
        COOLDOWN_DEFENCE_ATTACK: 5.0,
    },
    [types_1.CharacterName.ADE]: {
        MELEE_DAMAGE: 15.0,
        SPELL_DAMAGE: 100.0,
        SPELL_SPEED: 40.0,
        COOLDOWN_MELEE_ATTACK: 1.2,
        COOLDOWN_SPELL_ATTACK: 1.0,
        COOLDOWN_DEFENCE_ATTACK: 6.0,
    }
};
function calculateTeamId(spawnIndex, matchType) {
    switch (matchType) {
        case types_1.MatchType.FFA: {
            return spawnIndex;
        }
        case types_1.MatchType.TEAM: {
            return Math.floor(spawnIndex / types_1.GameConfig.MATCH.DEFAULT_PLAYERS_FOR_TEAM);
        }
        default:
            return 0;
    }
}
/* returns a player, if there is a position is modified else default position */
function getNewPlayer(world, socketId, spawnIndex, characterName, userDbId, entityId, isBot, playerIndex, matchType) {
    const teamId = calculateTeamId(spawnIndex, matchType);
    const character = (characterName in exports.CHARACTER_DATA) ? characterName : types_1.CharacterName.ZEUS;
    const stats = exports.CHARACTER_DATA[character];
    return {
        type: 'player',
        teamId: teamId,
        characterName: characterName,
        userDbId: userDbId,
        socketId: socketId,
        entityId: entityId,
        position: new utils_1.Vector(world.spawnPoints[spawnIndex].x, world.spawnPoints[spawnIndex].z),
        displacement: new utils_1.Vector(0, 0),
        radius: types_1.GameConfig.PLAYER.RADIUS,
        spawnIndex: spawnIndex,
        playerIndex: playerIndex || 0,
        rotation: 0.0,
        speed: types_1.GameConfig.PLAYER.SPEED,
        hp: types_1.GameConfig.PLAYER.DEFAULT_HP,
        kill: 0.0,
        deads: 0.0,
        damage: 0.0,
        meleeAttackCooldown: stats.COOLDOWN_MELEE_ATTACK,
        meleeAttackHitboxRadius: types_1.GameConfig.COMBAT.MELEE_HITBOX_RADIUS,
        meleeAttackDamage: stats.MELEE_DAMAGE,
        spellAttackCooldown: stats.COOLDOWN_SPELL_ATTACK,
        spellAttackDamage: stats.SPELL_DAMAGE,
        spellAttackHitboxRadius: types_1.GameConfig.COMBAT.SPELL_HITBOX_RADIUS,
        spellAttackspeed: stats.SPELL_SPEED,
        defenceAttackCooldown: stats.COOLDOWN_DEFENCE_ATTACK,
        attackType: undefined,
        isAttacking: false,
        isDead: false,
        isWinner: false,
        isGhost: false,
        isDefending: false,
        isBot: isBot,
        respawnTimer: 0,
        disconnectionTimer: 0.0,
        isDisconnected: false,
        inputQueue: [],
        currentState: undefined,
        clutchMasterUnlook: false,
    };
}
