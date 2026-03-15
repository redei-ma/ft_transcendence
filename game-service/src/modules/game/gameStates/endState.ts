import { Logger } from "@nestjs/common";
import { Vector, GameConfig, AttackType, ExitStatus, ErrorCode } from "@transcendence/types";
import { GameSession } from "../core";
import { IGameState } from "./game.state.interface";
import { MatchResult } from "src/types/match-result.interface";
import { MatchMakingData } from "../game-interfaces";

export class EndState implements IGameState{
	logger: Logger = new Logger(EndState.name);
	name = 'END';
	private shutdownTimer: number = 0.0;
	public isReadyToClose: boolean = false;
	constructor(private readonly session: GameSession) {}
	onEnter(): void {
		this.logger.log("Game is over, shutdown the server");

		this.session.gameService.notifyMatchmakingEndGame(this.session.gameId);

		//sending the end game data to the database
		const endGameData: MatchResult = this.session.engine.endGameData;
		this.logger.debug('endGameData playersData');
		this.logger.debug(JSON.stringify(endGameData.players));

		this.logger.debug('endGameData endREason');
		this.logger.debug(endGameData.endReason);

		this.logger.debug('endGameData winnerId');
		this.logger.debug(endGameData.winningTeamId);

		this.session.gameService.saveMatchResult(endGameData);
	}

	update(dt: number): void {
		this.shutdownTimer += dt;
		if (this.shutdownTimer >= GameConfig.SERVER.SHUTDOWN_TIMER){
			this.isReadyToClose = true;
			this.logger.log(`Game is ready to be shutdown`);
		}
	}

	onInput(entityId: string, input: Vector, attackType: AttackType): void {
		return ;
	}

	onExit(): void {
	}

	addPlayer(player: MatchMakingData, socketId: string | undefined): ExitStatus {
		return ({status: ErrorCode.UNAUTHORIZED, message: 'unable to add player, the game is in ending mode'});
	}

	reconnectPlayer(userDbId: number, socketId: string): ExitStatus{
		return ({status: ErrorCode.UNAUTHORIZED, message: 'unable to reconnect player, the game is in ending mode'});
	}
}