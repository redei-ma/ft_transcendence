import { GameConfig } from "../configs/game.config";
import { Snapshot } from "../factories/snapshot.factory";
import { GameRules } from "./game.rules";
import { World } from "./game.world";
import { PlayerManager } from "../managers/playerManager/player.manager";
import { BulletManager } from "../managers/bullet.manager";
import {  MatchResult, 
	Player, PlayerSnapshot, BulletSnapshot,
	GameEndEvents, GameStateEvents,
	EndReason, MatchType, 
	MatchMode} from "../interfaces-enums";

export class Engine{

	private gameTimer: number = 0;
	private playerEvents: PlayerSnapshot[] = [];
	private bulletEvents: BulletSnapshot[] = [];
	private endEvents: GameEndEvents[] = [];
	private stateEvents: GameStateEvents[] = [];

	public endGameData: MatchResult = {
		mode: MatchMode.RANKED,
		type: MatchType.FFA,
		endReason: EndReason.KILLOUT,
		durationSeconds: 0.0,
		winningTeamId: -1,
		players: [],
	};

	constructor(private readonly players: Map<string, Player>,
		private readonly gameWorld: World,
		private readonly gameRules: GameRules,
		private readonly playerManager: PlayerManager,
		private readonly bulletManager: BulletManager,
		private readonly matchType: MatchType,
		private readonly matchMode: MatchMode) {
			this.endGameData.type = matchType;
			this.endGameData.mode = matchMode;
		}

		public updateEvents(dt: number): (GameStateEvents | GameEndEvents)[]{

			this.playerEvents.length = 0;
			this.bulletEvents.length = 0;
			this.stateEvents.length = 0;
			this.endEvents.length = 0;

			this.gameTimer += dt;

			if (this.gameTimer >= GameConfig.SERVER.MAX_GAME_DURATION){
				this.handleGameOver(true);
				return [...this.stateEvents, ...this.endEvents];
			}

			this.playerManager.updateAllPlayers(this.players, this.gameWorld, dt);

			/* updating bullet logic */
			this.bulletManager.updateBullets(dt, this.gameWorld, this.players);

			/* creating snapshot for the bullets */
			this.gameWorld.bullets.forEach((bullet => {
				if (bullet.isActive)
					this.bulletEvents.push(Snapshot.toBulletSnapshot(bullet));
			}));

			/* creating snapshot for the players */
			this.players.forEach((player => {
					this.playerEvents.push(Snapshot.toPlayerSnapshot(player));
			}));

			this.pushGameEvents();

			this.handleGameOver(false);

			return [...this.stateEvents, ...this.endEvents];
		}

		/* Game Over handling */
		public handleGameOver(overTime: boolean): void{

			/* if there is a winner team, the game is over */
			let winnerTeam: number | null = null;
			winnerTeam = this.gameRules.checkWinner(Array.from(this.players.values()), overTime);
			if (winnerTeam !== null){
				this.pushEndGameEvent(winnerTeam, overTime ? EndReason.TIMEOUT : EndReason.KILLOUT);
			}

			if (winnerTeam === null && overTime){
					this.pushEndGameEvent(-1, overTime ? EndReason.TIMEOUT : EndReason.KILLOUT);
			}

			winnerTeam = this.gameRules.checkRemaningTeam(this.players.values());
			if (winnerTeam !== null){
				this.pushEndGameEvent(winnerTeam, EndReason.RESIGNATION);
				return ;
			}
		}

		/* Pushing methods */
		private pushGameEvents(): void{
			this.stateEvents.push({
				eventName: 'game-state',
				data: {
					players: this.playerEvents,
					bullets: this.bulletEvents
				},
				time: this.gameTimer,
			})
		}

		private pushEndGameEvent(winnerTeamId: number, reason: EndReason): void{
			let winnerPlayersIds: string[] = [];
			if (winnerTeamId !== -1)
				winnerPlayersIds = this.getPlayersByTeam(winnerTeamId).map(p => p.entityId);
			this.endEvents.push({
				eventName: 'game-over',
				winnerData: { winnerTeam: winnerTeamId, winnerPlayersIds: winnerPlayersIds },
				time: this.gameTimer,
			});

			this.fillEndGameData(winnerTeamId, reason);
		}

		private fillEndGameData(winnerTeamId: number | null, reason: EndReason){
			this.endGameData.durationSeconds = this.gameTimer;
			this.endGameData.endReason = reason;
			for (const player of this.players.values()){
				if (player.userDbId){
					this.endGameData.players.push({
						userId: player.userDbId,
						teamId: player.teamId,
						characterName: player.characterName,
						kills: player.kill,
						deaths: player.deads,
						clutchMasterAchievement: player.clutchMasterAchievement,
					});
				}
			}
			if (winnerTeamId === -1)
				winnerTeamId = null;
			this.endGameData.winningTeamId = winnerTeamId;
		}

		/* Getters */
		private getPlayersByTeam(team: number): Player[]{
			return (Array.from(this.players.values()).filter(player => player.teamId === team));
		}
}