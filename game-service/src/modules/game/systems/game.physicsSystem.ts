import { Injectable } from "@nestjs/common";
import { World } from "../core";
import { Vector, BulletHit, Bullet, Player } from "@transcendence/types";

@Injectable()
export class PhysicsSystem{
	private readonly recicleVector: Vector = new Vector(0, 0);

	calculateBulletPhysics(bullet: Bullet, players: Map<string, Player>, gameWorld: World, dt: number): void{
		const nextX = bullet.position.x + bullet.displacement.x * bullet.speed * dt;
		const nextZ = bullet.position.z + bullet.displacement.z * bullet.speed * dt;
		this.recicleVector.set(nextX, bullet.position.z);
		if (!this.isEnvironmentCollision(this.recicleVector, bullet.radius, gameWorld)){
				bullet.position.x = nextX;
		}
		else{
			bullet.hit = BulletHit.WALL_HIT;
			return ;
		}
		let	victimHit: boolean = this.isVictimHit(bullet, players);
		if (victimHit)
			return ;

		this.recicleVector.set(bullet.position.x, nextZ);
		victimHit = this.isVictimHit(bullet, players);
		if (victimHit)
			return ;
		if (!this.isEnvironmentCollision(this.recicleVector, bullet.radius, gameWorld)){
				bullet.position.z = nextZ;
		}
		else{
			bullet.hit = BulletHit.WALL_HIT;
			return ;
		}
		bullet.lifeTime -= dt;
		return ;
	}

	private isVictimHit(bullet: Bullet, players: Map<string, Player>){
		let victim = this.isPlayerCollision(bullet.ownerId, this.recicleVector, bullet.radius, players.values());
		if (victim && !victim.isDead && victim.teamId !== bullet.teamId){
			bullet.entityHit = victim;
			bullet.hit = BulletHit.PLAYER_HIT;
			return (true);
		}
		return (false);
	}

	calculatePhysics(entity: Player, players: Map<string, Player>, gameWorld: World, dt: number): void{
		// Physics formula: New Position = Old Position + (Direction * Speed * DeltaTime)
		const nextX = entity.position.x + entity.displacement.x * entity.speed * dt;
		const nextZ = entity.position.z + entity.displacement.z * entity.speed * dt;
		this.recicleVector.set(nextX, entity.position.z);
		if (!this.isEnvironmentCollision(this.recicleVector, entity.radius, gameWorld)){
			if (entity.isGhost)
				entity.position.x = nextX;
			else if (!this.isPlayerCollision(entity.entityId, this.recicleVector, entity.radius, players.values())){
				entity.position.x = nextX;
			}
		}
		/* i recicle the old vector to avoid waste of memory */
		this.recicleVector.set(entity.position.x, nextZ);
		if (!this.isEnvironmentCollision(this.recicleVector, entity.radius, gameWorld)){
			if (entity.isGhost)
				entity.position.z = nextZ;
			else if (!this.isPlayerCollision(entity.entityId, this.recicleVector, entity.radius, players.values())){
				entity.position.z = nextZ;
			}
		}
	}

	isPillarCollision(entityPosition: Vector, entityRadius: number, gameWorld: World): boolean{
		for (const pillar of gameWorld.pillars.values()){
			let dx: number = entityPosition.x - pillar.position.x;
			let dz: number = entityPosition.z - pillar.position.z;
			let distanceSquared: number = dx * dx + dz * dz;
			let radiiSum: number = entityRadius + pillar.radius;
			if (distanceSquared <= radiiSum * radiiSum){
				return true;
			}
		}
		return false;
	}

	isPlayerCollision(moverId: string, moverPosition: Vector, moverRadius: number, players: Iterable<Player>): Player | undefined{
		for (const player of players){
			if (moverId !== player.entityId && !player.isDead){
				if (player.isGhost)
					continue;
				/* I use the Pythagorean theorem to calculate the distance between the centers of the players*/
				let dx: number = player.position.x - moverPosition.x;
				let dz: number = player.position.z - moverPosition.z;
				let distanceSquared: number = dx * dx + dz * dz;
				let radiiSum = moverRadius + player.radius;
				/* if the distanceSquared is < of the sum of the radii squared, collision is true */
				if (distanceSquared <= radiiSum * radiiSum)
					return (player);
				}
		}
		return (undefined);
	}

	private isEnvironmentCollision(pos: Vector, radius: number, world: World): boolean {
		return world.isWallCollision(pos, radius) || this.isPillarCollision(pos, radius, world);
	}
}