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
import { ConfigService } from '@nestjs/config';
import { NetworkConfig } from '@transcendence/types';
import { MatchMakingController } from './controllers/game.Matchmaking.controller';
import { JwtAuthGuard } from '@transcendence/auth';
import { MatchResultModule } from '../result/match-result.module';
import { AiService } from './core/aiService/game.aiService';

@Module({
	imports: [
		MatchResultModule,
		ClientsModule.registerAsync([
			{
				name: NetworkConfig.MATCHMAKING.SERVICE.REDIS,
				useFactory: (configService: ConfigService) => ({
					transport: Transport.REDIS,
					options: {
						host: configService.get<string>('REDIS_HOST'),
						port: configService.get<number>('REDIS_PORT'),
					},
				}),
				inject: [ConfigService],
			},
		]),
	],
	controllers: [MatchMakingController],
	providers: [
		AiService,
		GameService, 
		GameGateway, 
		PhysicsSystem, 
		CombatSystem, 
		GameRules, 
		MapManager, 
		PlayerManager, 
		BulletManager,
		JwtAuthGuard,
	],
	exports: [ClientsModule]
})
export class GameModule {}
