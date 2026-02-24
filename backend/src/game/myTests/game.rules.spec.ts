import { GameRules } from '../core/game.rules';
import { getNewPlayer } from '../factories/player.factory';
import { CharacterName, MatchType, Player, World } from '../interfaces-enums';
import { randomUUID } from 'crypto';

describe('GameRules', () => {
  let gameRules: GameRules;
  let dummyWorld: any; 

  beforeEach(() => {
    gameRules = new GameRules();
    
    // FIX 1: spawnPoints alla radice e usando 'z' invece di 'y'
    dummyWorld = {
      maxPlayers: 2,
      spawnPoints: [
        { x: 0, z: 0 },
        { x: 100, z: 100 }
      ]
    };
  });

  describe('shouldGameStart()', () => {

    it('dovrebbe ritornare FALSE se la lobby non è ancora piena (1 su 2)', () => {
      const players = new Map<string, Player>();
      const entityId1 = randomUUID();
      
      const player1 = getNewPlayer(
        dummyWorld as unknown as World, 'socket-123', 0, CharacterName.ZEUS, 
        1, entityId1, false, 0, MatchType.RANKED
      );
      players.set(entityId1, player1);

      const result = gameRules.shouldGameStart(players, dummyWorld.maxPlayers);
      expect(result).toBe(false); 
    });

    it('dovrebbe ritornare TRUE se la lobby è piena (2 su 2)', () => {
      const players = new Map<string, Player>();
      
      const entityId1 = randomUUID();
      const player1 = getNewPlayer(
        dummyWorld as unknown as World, 'socket-123', 0, CharacterName.ZEUS, 
        1, entityId1, false, 0, MatchType.RANKED
      );
      players.set(entityId1, player1);

      const entityId2 = randomUUID();
      const player2 = getNewPlayer(
        dummyWorld as unknown as World, 'socket-456', 1, CharacterName.ZEUS, 
        2, entityId2, false, 1, MatchType.RANKED
      );
      players.set(entityId2, player2);

      const result = gameRules.shouldGameStart(players, dummyWorld.maxPlayers);
      expect(result).toBe(true);
    });

  });

  describe('getSpawnPoint()', () => {

    it('dovrebbe ritornare 0 come spawn index per il primo giocatore', () => {
      const players = new Map<string, Player>(); 
      const spawnIndex = gameRules.getSpawnPoint(players, dummyWorld.maxPlayers);
      expect(spawnIndex).toBe(0); 
    });

    it('dovrebbe ritornare -1 se provi a chiedere uno spawn ma la lobby è già piena', () => {
      const players = new Map<string, Player>();
      
      // FIX 2: Assegniamo uno spawnIndex ai giocatori finti!
      players.set(randomUUID(), { spawnIndex: 0 } as Player); 
      players.set(randomUUID(), { spawnIndex: 1 } as Player);

      const spawnIndex = gameRules.getSpawnPoint(players, dummyWorld.maxPlayers);
      expect(spawnIndex).toBe(-1); 
    });

  });
});