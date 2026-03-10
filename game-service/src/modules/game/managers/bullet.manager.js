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
exports.BulletManager = void 0;
const common_1 = require("@nestjs/common");
const systems_1 = require("../systems");
const types_1 = require("@transcendence/types");
let BulletManager = class BulletManager {
    constructor(physicsSystem, combatSystem) {
        this.physicsSystem = physicsSystem;
        this.combatSystem = combatSystem;
    }
    updateBullets(dt, gameWorld, players) {
        for (const bullet of gameWorld.bullets.values()) {
            if (!bullet.isActive)
                continue;
            let attacker = players.get(bullet.ownerId);
            if (!attacker) {
                bullet.isActive = false;
                continue;
            }
            this.physicsSystem.calculateBulletPhysics(bullet, players, gameWorld, dt);
            if (bullet.hit !== types_1.BulletHit.NONE || bullet.lifeTime <= 0) {
                if (bullet.hit === types_1.BulletHit.PLAYER_HIT && bullet.entityHit) {
                    this.combatSystem.applyDamage(bullet.entityHit, attacker, types_1.AttackType.SPELL_ATTACK);
                }
                bullet.isActive = false;
            }
        }
    }
};
exports.BulletManager = BulletManager;
exports.BulletManager = BulletManager = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [systems_1.PhysicsSystem,
        systems_1.CombatSystem])
], BulletManager);
