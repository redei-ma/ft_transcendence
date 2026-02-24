import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { CombatSystem } from './systems/game.combatSystem';
import { PhysicsSystem } from './systems/game.physicsSystem';
import { GameRules } from './core/game.rules';
import { MapManager } from './managers/game.mapManager';
import { PlayerManager } from './managers/playerManager/player.manager';
import { BulletManager } from './managers/bullet.manager';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NetworkConfig } from './configs/network.config';
import { MatchMakingController } from './game.Matchmaking.controller';

@Module({
	imports: [
		ClientsModule.register([
			{
				name: NetworkConfig.MATCHMAKING.SERVICE.REDIS,
				transport: Transport.REDIS,
				options: {
					host: process.env.REDIS_HOST || 'localhost',
					port: 6379,
				},
			},
		]),
	],
	controllers: [MatchMakingController],
	providers: [
		GameService, 
		GameGateway, 
		PhysicsSystem, 
		CombatSystem, 
		GameRules, 
		MapManager, 
		PlayerManager, 
		BulletManager
	],
	exports: [ClientsModule]
})
export class GameModule {}
