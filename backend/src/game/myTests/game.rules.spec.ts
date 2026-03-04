import { GameRules } from '../core/game.rules';
import { Player } from '../interfaces-enums';
import { GameConfig } from '../configs/game.config';

describe('GameRules', () => {
    let gameRules: GameRules;

    // Viene eseguito prima di ogni test
    beforeEach(() => {
        gameRules = new GameRules();
    });

    // ---------------------------------------------------------
    // TEST PER: checkWinner
    // ---------------------------------------------------------
    describe('checkWinner', () => {
        it('dovrebbe restituire null se nessuno ha raggiunto le kill massime e non c\'è overtime', () => {
            const players = [
                { teamId: 1, kill: GameConfig.SERVER.MAX_GAME_KILLS - 1 },
                { teamId: 2, kill: GameConfig.SERVER.MAX_GAME_KILLS - 1 }
            ] as unknown as Player[];

            const winner = gameRules.checkWinner(players, false);
            expect(winner).toBeNull();
        });

        it('dovrebbe restituire il team vincente se ha raggiunto le kill massime (senza overtime)', () => {
            const players = [
                { teamId: 1, kill: GameConfig.SERVER.MAX_GAME_KILLS },
                { teamId: 2, kill: 5 }
            ] as unknown as Player[];

            const winner = gameRules.checkWinner(players, false);
            expect(winner).toBe(1); // Il team 1 ha vinto
        });

        it('dovrebbe restituire il team con più kill in OverTime (anche se non ha raggiunto il cap)', () => {
            const players = [
                { teamId: 1, kill: 4 },
                { teamId: 2, kill: 7 } // Team 2 ha più kill
            ] as unknown as Player[];

            const winner = gameRules.checkWinner(players, true);
            expect(winner).toBe(2);
        });

        it('dovrebbe sommare le kill dei giocatori dello stesso team in OverTime', () => {
            const players = [
                { teamId: 1, kill: 2 },
                { teamId: 1, kill: 3 }, // Totale Team 1 = 5
                { teamId: 2, kill: 4 }  // Totale Team 2 = 4
            ] as unknown as Player[];

            const winner = gameRules.checkWinner(players, true);
            expect(winner).toBe(1); // Vince il team 1 (5 kill totali contro 4)
        });
    });

    // ---------------------------------------------------------
    // TEST PER: checkRemaningTeam
    // ---------------------------------------------------------
    describe('checkRemaningTeam', () => {
        it('dovrebbe restituire null se ci sono ancora giocatori di team diversi', () => {
            const players = [
                { teamId: 1 },
                { teamId: 2 }
            ] as unknown as Player[];

            const winner = gameRules.checkRemaningTeam(players);
            expect(winner).toBeNull();
        });

        it('dovrebbe restituire il teamId se tutti i giocatori rimasti appartengono allo stesso team', () => {
            const players = [
                { teamId: 2 },
                { teamId: 2 }
            ] as unknown as Player[];

            const winner = gameRules.checkRemaningTeam(players);
            expect(winner).toBe(2);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: shouldGameStart
    // ---------------------------------------------------------
    describe('shouldGameStart', () => {
        it('dovrebbe restituire true se la mappa giocatori ha raggiunto il numero massimo', () => {
            const playersMap = new Map<string, Player>();
            playersMap.set('socket1', {} as Player);
            playersMap.set('socket2', {} as Player);

            const result = gameRules.shouldGameStart(playersMap, 2);
            expect(result).toBe(true);
        });

        it('dovrebbe restituire false se mancano giocatori', () => {
            const playersMap = new Map<string, Player>();
            playersMap.set('socket1', {} as Player);

            const result = gameRules.shouldGameStart(playersMap, 4);
            expect(result).toBe(false);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: getSpawnPoint
    // ---------------------------------------------------------
    describe('getSpawnPoint', () => {
        it('dovrebbe restituire 0 se la mappa è vuota', () => {
            const playersMap = new Map<string, Player>();
            const spawnPoint = gameRules.getSpawnPoint(playersMap, 2);
            expect(spawnPoint).toBe(0);
        });

        it('dovrebbe restituire il primo indice libero se alcuni sono occupati', () => {
            const playersMap = new Map<string, Player>();
            // Il giocatore 1 occupa l'indice 0
            playersMap.set('socket1', { spawnIndex: 0 } as unknown as Player);
            // Il giocatore 2 occupa l'indice 2
            playersMap.set('socket2', { spawnIndex: 2 } as unknown as Player);

            // Il primo libero deve essere l'1
            const spawnPoint = gameRules.getSpawnPoint(playersMap, 4);
            expect(spawnPoint).toBe(1);
        });

        it('dovrebbe restituire -1 se tutti gli slot di spawn sono occupati', () => {
            const playersMap = new Map<string, Player>();
            playersMap.set('socket1', { spawnIndex: 0 } as unknown as Player);
            playersMap.set('socket2', { spawnIndex: 1 } as unknown as Player);

            const spawnPoint = gameRules.getSpawnPoint(playersMap, 2);
            expect(spawnPoint).toBe(-1);
        });
    });
});