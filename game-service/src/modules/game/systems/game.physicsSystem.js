"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsSystem = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("../utils");
const types_1 = require("@transcendence/types");
let PhysicsSystem = class PhysicsSystem {
    constructor() {
        this.recicleVector = new utils_1.Vector(0, 0);
    }
    calculateBulletPhysics(bullet, players, gameWorld, dt) {
        const nextX = bullet.position.x + bullet.displacement.x * bullet.speed * dt;
        const nextZ = bullet.position.z + bullet.displacement.z * bullet.speed * dt;
        this.recicleVector.set(nextX, bullet.position.z);
        if (!this.isEnvironmentCollision(this.recicleVector, bullet.radius, gameWorld)) {
            bullet.position.x = nextX;
        }
        else {
            bullet.hit = types_1.BulletHit.WALL_HIT;
            return;
        }
        let victimHit = this.isVictimHit(bullet, players);
        if (victimHit)
            return;
        this.recicleVector.set(bullet.position.x, nextZ);
        victimHit = this.isVictimHit(bullet, players);
        if (victimHit)
            return;
        if (!this.isEnvironmentCollision(this.recicleVector, bullet.radius, gameWorld)) {
            bullet.position.z = nextZ;
        }
        else {
            bullet.hit = types_1.BulletHit.WALL_HIT;
            return;
        }
        bullet.lifeTime -= dt;
        return;
    }
    isVictimHit(bullet, players) {
        let victim = this.isPlayerCollision(bullet.ownerId, this.recicleVector, bullet.radius, players.values());
        if (victim && !victim.isDead && victim.teamId !== bullet.teamId) {
            bullet.entityHit = victim;
            bullet.hit = types_1.BulletHit.PLAYER_HIT;
            return (true);
        }
        return (false);
    }
    calculatePhysics(entity, players, gameWorld, dt) {
        // Physics formula: New Position = Old Position + (Direction * Speed * DeltaTime)
        const nextX = entity.position.x + entity.displacement.x * entity.speed * dt;
        const nextZ = entity.position.z + entity.displacement.z * entity.speed * dt;
        this.recicleVector.set(nextX, entity.position.z);
        if (!this.isEnvironmentCollision(this.recicleVector, entity.radius, gameWorld)) {
            if (entity.isGhost)
                entity.position.x = nextX;
            else if (!this.isPlayerCollision(entity.entityId, this.recicleVector, entity.radius, players.values())) {
                entity.position.x = nextX;
            }
        }
        /* i recicle the old vector to avoid waste of memory */
        this.recicleVector.set(entity.position.x, nextZ);
        if (!this.isEnvironmentCollision(this.recicleVector, entity.radius, gameWorld)) {
            if (entity.isGhost)
                entity.position.z = nextZ;
            else if (!this.isPlayerCollision(entity.entityId, this.recicleVector, entity.radius, players.values())) {
                entity.position.z = nextZ;
            }
        }
    }
    isPillarCollision(entityPosition, entityRadius, gameWorld) {
        for (const pillar of gameWorld.pillars.values()) {
            let dx = entityPosition.x - pillar.position.x;
            let dz = entityPosition.z - pillar.position.z;
            let distanceSquared = dx * dx + dz * dz;
            let radiiSum = entityRadius + pillar.radius;
            if (distanceSquared <= radiiSum * radiiSum) {
                return true;
            }
        }
        return false;
    }
    isPlayerCollision(moverId, moverPosition, moverRadius, players) {
        for (const player of players) {
            if (moverId !== player.entityId && !player.isDead) {
                if (player.isGhost)
                    continue;
                /* I use the Pythagorean theorem to calculate the distance between the centers of the players*/
                let dx = player.position.x - moverPosition.x;
                let dz = player.position.z - moverPosition.z;
                let distanceSquared = dx * dx + dz * dz;
                let radiiSum = moverRadius + player.radius;
                /* if the distanceSquared is < of the sum of the radii squared, collision is true */
                if (distanceSquared <= radiiSum * radiiSum)
                    return (player);
            }
        }
        return (undefined);
    }
    isEnvironmentCollision(pos, radius, world) {
        return world.isWallCollision(pos, radius) || this.isPillarCollision(pos, radius, world);
    }
};
exports.PhysicsSystem = PhysicsSystem;
exports.PhysicsSystem = PhysicsSystem = __decorate([
    (0, common_1.Injectable)()
], PhysicsSystem);
