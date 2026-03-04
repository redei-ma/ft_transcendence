import { Engine } from '../core/game.engine';
import { World } from '../core/game.world';
import { GameRules } from '../core/game.rules';
import { Snapshot } from '../factories/snapshot.factory';
import { GameConfig } from '../configs/game.config';
import { Player, Bullet, MatchType, MatchMode, EndReason, BulletHit, CharacterName } from '../interfaces-enums';
import { Vector } from '../utils/game.vector';

describe('Engine', () => {
    let engine: Engine;
    let players: Map<string, Player>;
    let mockWorld: any;
    let mockGameRules: any;
    let mockPlayerManager: any;
    let mockBulletManager: any;

    beforeEach(() => {
        players = new Map();

        mockWorld = {
            bullets: new Map<number, Bullet>(),
        };

        mockGameRules = {
            checkWinner: jest.fn().mockReturnValue(null),
            checkRemaningTeam: jest.fn().mockReturnValue(null),
        };

        mockPlayerManager = {
            updateAllPlayers: jest.fn(),
        };

        mockBulletManager = {
            updateBullets: jest.fn(),
        };

        // Facciamo il mock statico dello Snapshot Factory per evitare calcoli inutili
        jest.spyOn(Snapshot, 'toPlayerSnapshot').mockReturnValue({} as any);
        jest.spyOn(Snapshot, 'toBulletSnapshot').mockReturnValue({} as any);

        engine = new Engine(
            players,
            mockWorld as World,
            mockGameRules as GameRules,
            mockPlayerManager,
            mockBulletManager,
            MatchType.FFA,
            MatchMode.RANKED
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ---------------------------------------------------------
    // TEST PER: L'Inizializzazione
    // ---------------------------------------------------------
    describe('Costruttore', () => {
        it('dovrebbe inizializzare endGameData con i valori corretti', () => {
            expect(engine.endGameData.type).toBe(MatchType.FFA);
            expect(engine.endGameData.mode).toBe(MatchMode.RANKED);
            expect(engine.endGameData.players).toEqual([]);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: updateEvents (Il ciclo vitale del Tick)
    // ---------------------------------------------------------
    describe('updateEvents', () => {
        it('dovrebbe aggiornare giocatori e proiettili e restituire un evento game-state', () => {
            players.set('p1', { entityId: 'p1' } as Player);
            mockWorld.bullets.set(0, { isActive: true } as Bullet);

            const events = engine.updateEvents(1.0); // Avanti di 1 secondo

            expect(mockPlayerManager.updateAllPlayers).toHaveBeenCalled();
            expect(mockBulletManager.updateBullets).toHaveBeenCalled();

            expect(Snapshot.toPlayerSnapshot).toHaveBeenCalled();
            expect(Snapshot.toBulletSnapshot).toHaveBeenCalled();

            expect(events.length).toBe(1);
            expect(events[0].eventName).toBe('game-state');
        });

        it('dovrebbe forzare il GameOver se il tempo supera MAX_GAME_DURATION', () => {
            const timeLimit = GameConfig.SERVER.MAX_GAME_DURATION;
            
            const events = engine.updateEvents(timeLimit + 1);

            expect(mockPlayerManager.updateAllPlayers).not.toHaveBeenCalled();
            
            expect(mockGameRules.checkWinner).toHaveBeenCalledWith(expect.any(Array), true);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handleGameOver e fillEndGameData
    // ---------------------------------------------------------
    describe('handleGameOver', () => {
        it('dovrebbe dichiarare la vittoria per KILLOUT se checkWinner restituisce un team', () => {
            mockGameRules.checkWinner.mockReturnValue(1); // Il team 1 ha raggiunto il limite di kill

            players.set('p1', { 
                entityId: 'p1', 
                teamId: 1, 
                userDbId: 'user-123',
                characterName: CharacterName.ZEUS,
                kill: 5,
                deads: 0,
                clutchMasterAchievement: true 
            } as Player);

            engine.handleGameOver(false); // overTime = false

            expect(engine.endGameData.winningTeamId).toBe(1);
            expect(engine.endGameData.endReason).toBe(EndReason.KILLOUT);
            
            expect(engine.endGameData.players.length).toBe(1);
            expect(engine.endGameData.players[0].userId).toBe('user-123');
            expect(engine.endGameData.players[0].kills).toBe(5);
            expect(engine.endGameData.players[0].clutchMasterAchievement).toBe(true);
        });

        it('dovrebbe dichiarare la vittoria per RESIGNATION se rimane un solo team', () => {
            mockGameRules.checkWinner.mockReturnValue(null); 
            mockGameRules.checkRemaningTeam.mockReturnValue(2);

            engine.handleGameOver(false);

            expect(engine.endGameData.winningTeamId).toBe(2);
            expect(engine.endGameData.endReason).toBe(EndReason.RESIGNATION);
        });

        it('dovrebbe dichiarare un pareggio (Timeout senza vincitore) in overtime', () => {
            mockGameRules.checkWinner.mockReturnValue(null); 
            mockGameRules.checkRemaningTeam.mockReturnValue(null);

            engine.handleGameOver(true);

            expect(engine.endGameData.winningTeamId).toBeNull();
            expect(engine.endGameData.endReason).toBe(EndReason.TIMEOUT);
        });
    });
});