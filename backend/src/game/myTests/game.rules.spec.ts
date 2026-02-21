import { Test, TestingModule } from '@nestjs/testing';
import { GameRules } from '../core/game.rules';
import { Player } from '../interfaces-enums';
import { getNewPlayer } from '../factories';

describe('GameRules', () => {
  let service: GameRules;

  beforeEach(async () => {
	const module: TestingModule = await Test.createTestingModule({
	  providers: [GameRules],
	}).compile();

	service = module.get<GameRules>(GameRules);
	
});

	it('should return 1 if spawn 0 is taken', () => {
		const players: Map<string, Player> = new Map();
		const newPlayer = getNewPlayer('player-a', 0, 'Zeus');
		players.set(newPlayer.id, newPlayer);
		expect(service.getSpawnPoint(players, 2)).toStrictEqual(1);
	});

	it('should return 0 if the map of player is empty', () =>{
		const players: Map<string, Player> = new Map();
		expect(service.getSpawnPoint(players, 2)).toStrictEqual(0);
	})

	it ('should return -1 if all place are full', () => {
		const players: Map<string, Player> = new Map();
		const newPlayer1 = getNewPlayer('player-a', 0, 'Zeus');
		const newPlayer2 = getNewPlayer('player-b', 1, 'Zeus');

		players.set(newPlayer1.id, newPlayer1);
		players.set(newPlayer2.id, newPlayer2);

		expect(service.getSpawnPoint(players, 2)).toStrictEqual(-1);
	})

	it ('should return undefined if nobody dies', () => {
		const players: Map<string, Player> = new Map();
		const newPlayer1 = getNewPlayer('player-a', 0, 'Zeus');
		const newPlayer2 = getNewPlayer('player-b', 1, 'Zeus');

		players.set(newPlayer1.id, newPlayer1);
		players.set(newPlayer2.id, newPlayer2);

		expect(service.checkWinner(Array.from(players.values()), false)).toStrictEqual(undefined);
	})

	it ('should return player-a if player-b dies', () => {
		const overTime = false;
		const players: Map<string, Player> = new Map();
		const newPlayer1 = getNewPlayer('player-a', 0, 'Zeus');
		const newPlayer2 = getNewPlayer('player-b', 1, 'Zeus');

		players.set(newPlayer1.id, newPlayer1);
		players.set(newPlayer2.id, newPlayer2);

		const player2 :Player | undefined = players.get(newPlayer2.id);
		if (player2)
			player2.isDead = true;
		expect(service.checkWinner(Array.from(players.values()), overTime)).toStrictEqual(newPlayer1);
	})

	it ('should return undefined if only one player die', () => {
		const overTime = false;
		const players: Map<string, Player> = new Map();
		const newPlayer1 = getNewPlayer('player-a', 0, 'Zeus');
		const newPlayer2 = getNewPlayer('player-b', 1, 'Zeus');
		const newPlayer3 = getNewPlayer('player-c', 0, 'Zeus');

		players.set(newPlayer1.id, newPlayer1);
		players.set(newPlayer2.id, newPlayer2);
		players.set(newPlayer3.id, newPlayer3);

		const player2 :Player | undefined = players.get(newPlayer2.id);
		if (player2)
			player2.isDead = true;
		expect(service.checkWinner(Array.from(players.values()), overTime)).toStrictEqual(undefined);
	})
});