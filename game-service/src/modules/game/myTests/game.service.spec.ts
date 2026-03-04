import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from '../game.service';
import { GameRules, GameSession } from '../core';
import { PlayerManager, MapManager, BulletManager } from '../managers';
import { NetworkConfig } from '../configs';
import { MatchType, MatchMode, ErrorCode, SuccessCode, MapData, CharacterName, Player, AttackType } from '../interfaces-enums';
import { Vector } from '../utils';

describe('GameService', () => {
    let service: GameService;
    let mockRedis: any;
    let mockMapManager: any;
    let mockServer: any;

    beforeEach(async () => {
        // 1. Mock di Redis (ClientProxy)
        // Dobbiamo simulare che emit() restituisca un oggetto con subscribe()
        mockRedis = {
            emit: jest.fn().mockReturnValue({
                subscribe: jest.fn(({ next, error }) => {
                    // Chiamiamo fittiziamente next() per simulare il successo
                    if (next) next();
                })
            }),
        };

        // 2. Mock del MapManager
        mockMapManager = {
            getMap: jest.fn().mockReturnValue({
                meta: { name: 'test-map', version: '1.0' },
                settings: { width: 100, depth: 100, maxPlayers: 2 },
                spawn_points: [], walls: [], pillars: []
            } as unknown as MapData),
        };

        // 3. Mock di Socket.io Server
        mockServer = {
            to: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            disconnectSockets: jest.fn(),
        };

        // Inizializziamo il modulo
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameService,
                { provide: GameRules, useValue: {} }, // Non ci serve la logica vera qui
                { provide: MapManager, useValue: mockMapManager },
                { provide: PlayerManager, useValue: {} },
                { provide: BulletManager, useValue: {} },
                {
                    provide: NetworkConfig.MATCHMAKING.SERVICE.REDIS,
                    useValue: mockRedis,
                },
            ],
        }).compile();

        service = module.get<GameService>(GameService);
        service.setServer(mockServer); // Inseriamo il finto server
        jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
        jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
        jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    });

    // ---------------------------------------------------------
    // TEST PER: prepareMatch
    // ---------------------------------------------------------
    describe('prepareMatch', () => {
        it('dovrebbe creare una nuova sessione e salvare i giocatori in memoria', () => {
            const players = [
                { userDbId: 'user-1', isAiPlayer: false, characterName: CharacterName.ZEUS },
                { userDbId: 'user-2', isAiPlayer: false, characterName: CharacterName.ADE }
            ];

            const result = service.prepareMatch('game-123', players, MatchMode.RANKED, MatchType.FFA);

            // Verifica che l'operazione sia andata a buon fine
            expect(result.status).toBe(SuccessCode.OK);

            // Verifica che il gioco sia stato salvato nella Map 'games'
            const session = service.getGameById('game-123');
            expect(session).toBeDefined();
            expect(session?.getGameId()).toBe('game-123');

            // Verifica che i giocatori siano stati salvati in 'userToGameData'
            expect(service.hasPendingMatch('user-1')?.gameId).toBe('game-123');
            expect(service.hasPendingMatch('user-2')?.gameId).toBe('game-123');
        });

        it('dovrebbe restituire un errore se la mappa non si carica', () => {
            mockMapManager.getMap.mockReturnValue(undefined); // Simuliamo un errore mappa
            
            const result = service.prepareMatch('game-123', [], MatchMode.RANKED, MatchType.FFA);
            
            expect(result.status).toBe(ErrorCode.MAP_LOAD_FAILED);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: removeSession
    // ---------------------------------------------------------
    describe('removeSession', () => {
        it('dovrebbe avvisare Redis e pulire tutte le Map dalla memoria', () => {
            // Creiamo una finta sessione da cancellare
            const mockSession = {
                getGameId: () => 'game-999',
                socketToEntities: new Map([['socket-1', ['entity-1']]]),
                expectedUserDbIds: ['user-1'],
                cleanUp: jest.fn(),
                engine: { endGameData: {} }
            } as unknown as GameSession;

            // Inseriamo manualmente dei finti dati nelle Map del service
            service['games'].set('game-999', mockSession);
            service['socketToGame'].set('socket-1', 'game-999');
            service['userToGameData'].set('user-1', { gameId: 'game-999', players: [] });

            // ACT: Cancelliamo la sessione
            service.removeSession(mockSession);

            // 1. Verifica che Redis sia stato avvisato
            expect(mockRedis.emit).toHaveBeenCalledWith(NetworkConfig.MATCHMAKING.MATCH_EVENTS.END_GAME, 'game-999');

            // 2. Verifica che le pulizie interne siano state fatte (Memory Leak Prevention!)
            expect(mockSession.cleanUp).toHaveBeenCalled();
            expect(service.getGameById('game-999')).toBeUndefined();
            expect(service['socketToGame'].has('socket-1')).toBe(false);
            expect(service.hasPendingMatch('user-1')).toBeUndefined();
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handlePlayerDisconnect
    // ---------------------------------------------------------
    describe('handlePlayerDisconnect', () => {
        it('dovrebbe impostare isDisconnected a true sul player se il socket si stacca', () => {
            const mockPlayer = { characterName: CharacterName.ZEUS, isDisconnected: false } as unknown as Player;
            
            const mockSession = {
                socketToEntities: new Map([['socket-1', ['entity-1']]]),
                players: new Map([['entity-1', mockPlayer]])
            } as unknown as GameSession;

            service['games'].set('game-1', mockSession);
            service.setSocketToGame('socket-1', 'game-1');

            const result = service.handlePlayerDisconnect('socket-1');

            expect(result.status).toBe(SuccessCode.OK);
            expect(mockPlayer.isDisconnected).toBe(true); // Il giocatore è diventato "fantasma"
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handleInput
    // ---------------------------------------------------------
    describe('handleInput', () => {
        it('dovrebbe instradare l\'input alla sessione corretta', () => {
            const mockSession = {
                processInput: jest.fn()
            } as unknown as GameSession;

            service['games'].set('game-1', mockSession);
            service.setSocketToGame('socket-1', 'game-1');

            const inputVector = new Vector(1, 0);
            service.handleInput('socket-1', inputVector, AttackType.MELEE_ATTACK, 0);

            expect(mockSession.processInput).toHaveBeenCalledWith('socket-1', inputVector, AttackType.MELEE_ATTACK, 0);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: onModuleDestroy (Spegnimento Graceful)
    // ---------------------------------------------------------
    describe('onModuleDestroy', () => {
        it('dovrebbe chiudere tutte le partite in corso e avvisare i socket', async () => {
            const mockSession = {
                getGameId: () => 'game-1',
                socketToEntities: new Map(),
                expectedUserDbIds: [],
                cleanUp: jest.fn(),
                engine: { endGameData: {} },
                server: mockServer // Usiamo il finto server
            } as unknown as GameSession;

            service['games'].set('game-1', mockSession);

            await service.onModuleDestroy();

            // Verifica che il messaggio di errore sia stato mandato nella stanza della partita
            expect(mockServer.to).toHaveBeenCalledWith('game-1');
            expect(mockServer.emit).toHaveBeenCalledWith('exception', expect.objectContaining({
                message: expect.stringContaining('shutdown')
            }));

            // Verifica che abbia chiuso a forza le connessioni
            expect(mockServer.in).toHaveBeenCalledWith('game-1');
            expect(mockServer.disconnectSockets).toHaveBeenCalledWith(true);
        });
    });
});