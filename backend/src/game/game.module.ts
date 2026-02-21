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
import { MatchMakingController } from './MatchMaking.controller';
import Redis from 'ioredis';

@Module({
		controllers: [MatchMakingController],
		providers: [GameService, GameGateway, PhysicsSystem, CombatSystem, GameRules, MapManager, PlayerManager, BulletManager,
			{
				provide: NetworkConfig.MATCHMAKING.SERVICE.REDIS_CLIENT,
				useFactory: () => {
					return new Redis({
						host: process.env.REDIS_HOST || 'localhost',
						port: 6379 //parseInt(process.env.REDIS_PORT) || 6379,
					});
				},
			},
		],
		exports: [NetworkConfig.MATCHMAKING.SERVICE.REDIS_CLIENT]
})
export class GameModule {}
