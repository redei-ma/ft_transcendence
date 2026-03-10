"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Snapshot = void 0;
class Snapshot {
    static toPlayerSnapshot(player) {
        let fixedX = Math.round(player.position.x * 100) / 100;
        let fixedZ = Math.round(player.position.z * 100) / 100;
        let fixedRotation = Math.round(player.rotation * 100) / 100;
        let snapshot = {
            //vedi game-states.interfaces.ts
            //type e characterName si potrebbero togliere? chiedere a fra
            type: 'player',
            characterName: player.characterName,
            //invece di entity id non e' meglio mandare userDbId?
            id: player.entityId,
            teamId: player.teamId,
            //x: fixedX,
            //z: fixedZ,
            position: { x: fixedX, z: fixedZ },
            rotation: fixedRotation,
            hp: player.hp,
            isAttacking: player.isAttacking,
            isDefending: player.isDefending,
            attackType: player.attackType,
            isDead: player.isDead,
            respawnTimer: player.respawnTimer,
            isDisconnected: player.isDisconnected,
            disconnectionTimer: player.disconnectionTimer,
        };
        return (snapshot);
    }
    static toBulletSnapshot(bullet) {
        let fixedX = Math.round(bullet.position.x * 100) / 100;
        let fixedZ = Math.round(bullet.position.z * 100) / 100;
        let snapshot = {
            //vedi game-states.interfaces.ts
            //type e characterName si potrebbero togliere? chiedere a fra
            type: 'bullet',
            id: bullet.entityId,
            characterName: bullet.characterName,
            position: { x: fixedX, z: fixedZ },
            //x: number,
            //z: number,
            entityHit: bullet.entityHit,
            hit: bullet.hit,
        };
        return (snapshot);
    }
}
exports.Snapshot = Snapshot;
