import { GameSession } from '../core/game.session';
import { Vector } from '../utils/game.vector';
import { GameConfig } from '../configs/game.config';
import { MatchType, MatchMode, AttackType, Player } from '../interfaces-enums';

describe('GameSession', () => {
    
    let session: GameSession;
    let mockServer: any;
    let mockWorld: any;
    let mockRules: any;
    let mockPlayerManager: any;
    let mockBulletManager: any;
    let mockGameService: any;

    beforeEach(() => {
        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        mockWorld = {
            maxPlayers: 2,
            bullets: [],
        };

        mockRules = {};
        mockPlayerManager = {};
        mockBulletManager = {};
        
        mockGameService = {
            removeSession: jest.fn(),
        };

        session = new GameSession(
            'game-123',
            mockServer,
            mockWorld,
            mockRules,
            mockPlayerManager,
            mockBulletManager,
            MatchType.FFA,
            MatchMode.RANKED,
            mockGameService
        );
        jest.spyOn(session['logger'], 'log').mockImplementation(() => {});
        jest.spyOn(session['logger'], 'warn').mockImplementation(() => {});
        jest.spyOn(session.engine, 'handleGameOver').mockImplementation(() => {});
    });

    // ---------------------------------------------------------
    // TEST PER: Inizializzazione
    // ---------------------------------------------------------
    describe('Inizializzazione', () => {
        it('dovrebbe inizializzarsi correttamente nello stato LOBBY', () => {
            expect(session.getGameId()).toBe('game-123');
            expect(session.matchType).toBe(MatchType.FFA);
            
            expect(session.getGameState()).toBe('LOBBY'); 
            expect(session.isJoinable()).toBe(true);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: processInput
    // ---------------------------------------------------------
    describe('processInput', () => {
        it('dovrebbe inoltrare l\'input allo stato corrente se il socket è valido', () => {
            const currentState = session['currentState'];
            jest.spyOn(currentState, 'onInput').mockImplementation(() => {});

            session.socketToEntities.set('socket-1', ['entity-1']);

            const input = new Vector(1, 0);
            session.processInput('socket-1', input, AttackType.MELEE_ATTACK, 0);

            expect(currentState.onInput).toHaveBeenCalledWith('entity-1', input, AttackType.MELEE_ATTACK);
        });

        it('NON dovrebbe inoltrare l\'input se il socket non è registrato', () => {
            const currentState = session['currentState'];
            jest.spyOn(currentState, 'onInput').mockImplementation(() => {});

            const input = new Vector(1, 0);
            session.processInput('socket-unknown', input, AttackType.MELEE_ATTACK, 0);

            expect(currentState.onInput).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------
    // TEST PER: update e Hard Limit
    // ---------------------------------------------------------
    describe('update', () => {
        it('dovrebbe forzare il passaggio a EndState se si supera l\'HARD_LIMIT di tempo', () => {
            const limit = GameConfig.SERVER.HARD_LIMIT;
            
            // Avanziamo il tempo poco sotto il limite
            session.update(limit - 1);
            expect(session.getGameState()).not.toBe('END');

            // Superiamo il limite (Questo farà scattare sia il timeout della Lobby che l'Hard Limit)
            session.update(2); 

            expect(session.getGameState()).toBe('END');
            expect(session.isGameOver()).toBe(true);
            expect(session.engine.handleGameOver).toHaveBeenCalledWith(true);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: removePlayer
    // ---------------------------------------------------------
    describe('removePlayer', () => {
        it('dovrebbe rimuovere il giocatore e disattivare i suoi proiettili', () => {
            const fakePlayer = {
                entityId: 'entity-1',
                socketId: 'socket-1',
                disconnectionTimer: GameConfig.SERVER.MAX_DISCONNECTION_TIMER + 1
            } as Player;

            const fakeBullet = { ownerId: 'entity-1', isActive: true };
            mockWorld.bullets.push(fakeBullet);

            session.players.set('entity-1', fakePlayer);
            session.socketToEntities.set('socket-1', ['entity-1']);

            session.removePlayer('entity-1');

            expect(session.players.has('entity-1')).toBe(false); 
            expect(session.socketToEntities.has('socket-1')).toBe(false); 
            expect(fakeBullet.isActive).toBe(false);
            expect(fakeBullet.ownerId).toBe('');
        });

        it('NON dovrebbe rimuoverlo se il timer di disconnessione è ancora basso', () => {
            const fakePlayer = {
                entityId: 'entity-1',
                disconnectionTimer: 0 
            } as Player;

            session.players.set('entity-1', fakePlayer);
            session.removePlayer('entity-1');

            expect(session.players.has('entity-1')).toBe(true);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: cleanUp e sendMessage
    // ---------------------------------------------------------
    describe('cleanUp', () => {
        it('dovrebbe svuotare tutte le mappe dei giocatori', () => {
            session.players.set('a', {} as Player);
            session.socketToEntities.set('b', ['a']);

            session.cleanUp();

            expect(session.players.size).toBe(0);
            expect(session.socketToEntities.size).toBe(0);
        });
    });

    describe('sendMessage', () => {
        it('dovrebbe emettere un evento Socket.io nella stanza corretta', () => {
            const fakeAuthor = { userDbId: 'user-777' } as Player;
            
            session.sendMessage(fakeAuthor, 'Ciao a tutti!');

            expect(mockServer.to).toHaveBeenCalledWith('game-123');
            expect(mockServer.emit).toHaveBeenCalledWith(
                expect.any(String), 
                expect.objectContaining({
                    author: 'user-777',
                    message: 'Ciao a tutti!'
                })
            );
        });
    });
});