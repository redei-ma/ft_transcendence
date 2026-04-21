import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from '../game.gateway';
import { GameService } from '../game.service';
import { WsThrottlerGuard } from '../guards/game.WsThrottlerGuard';
import { ErrorCode, SuccessCode } from '../interfaces-enums';
import { Vector } from '../utils';

describe('GameGateway', () => {
    let gateway: GameGateway;
    let mockGameService: any;
    let mockSocket: any;
    let mockSession: any;

    beforeEach(async () => {
        mockGameService = {
            setServer: jest.fn(),
            hasPendingMatch: jest.fn(),
            setSocketToGame: jest.fn(),
            getGameById: jest.fn(),
            handlePlayerDisconnect: jest.fn(),
            handleInput: jest.fn(),
            processGameMessage: jest.fn(),
        };

        mockSession = {
            addPlayer: jest.fn(),
        };

        mockSocket = {
            id: 'fake-socket-123',
            handshake: {
                query: { userDbId: 'user-1' }
            },
            join: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameGateway,
                {
                    provide: GameService,
                    useValue: mockGameService,
                },
            ],
        })
        .overrideGuard(WsThrottlerGuard)
        .useValue({ canActivate: () => true }) 
        .compile();

        gateway = module.get<GameGateway>(GameGateway);
    });

    // ---------------------------------------------------------
    // TEST PER: Inizializzazione
    // ---------------------------------------------------------
    describe('afterInit', () => {
        it('dovrebbe passare l\'istanza del server al GameService', () => {
            const mockServer = {} as any;
            gateway.afterInit(mockServer);
            expect(mockGameService.setServer).toHaveBeenCalledWith(mockServer);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handleConnection
    // ---------------------------------------------------------
    describe('handleConnection', () => {
        it('dovrebbe disconnettere il client se non ha partite in sospeso', () => {
            mockGameService.hasPendingMatch.mockReturnValue(undefined);

            gateway.handleConnection(mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith('exception', expect.objectContaining({
                errorCode: ErrorCode.PLAYER_NOT_FOUND
            }));
            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('dovrebbe disconnettere il client se la sessione non viene trovata', () => {
            mockGameService.hasPendingMatch.mockReturnValue({
                gameId: 'game-1',
                players: [{ userDbId: 'user-1' }]
            });
            mockGameService.getGameById.mockReturnValue(undefined);

            gateway.handleConnection(mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith('exception', expect.objectContaining({
                errorCode: ErrorCode.SESSION_NOT_FOUND
            }));
            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('dovrebbe far unire il client alla stanza e aggiungerlo alla sessione in caso di successo', () => {
            mockGameService.hasPendingMatch.mockReturnValue({
                gameId: 'game-1',
                players: [{ userDbId: 'user-1' }] 
            });
            mockGameService.getGameById.mockReturnValue(mockSession);
            mockSession.addPlayer.mockReturnValue({ status: SuccessCode.OK });

            gateway.handleConnection(mockSocket);

            expect(mockGameService.setSocketToGame).toHaveBeenCalledWith('fake-socket-123', 'game-1');
            expect(mockSocket.join).toHaveBeenCalledWith('game-1'); 
            expect(mockSession.addPlayer).toHaveBeenCalled(); 
            expect(mockSocket.disconnect).not.toHaveBeenCalled(); 
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handleDisconnect
    // ---------------------------------------------------------
    describe('handleDisconnect', () => {
        it('dovrebbe chiamare il service per gestire la disconnessione in modo pulito', () => {
            mockGameService.handlePlayerDisconnect.mockReturnValue({ status: SuccessCode.OK });

            gateway.handleDisconnect(mockSocket);

            expect(mockGameService.handlePlayerDisconnect).toHaveBeenCalledWith('fake-socket-123');
            expect(mockSocket.disconnect).not.toHaveBeenCalled(); 
        });

        it('dovrebbe inviare un\'eccezione se la rimozione fallisce', () => {
            mockGameService.handlePlayerDisconnect.mockReturnValue({ 
                status: ErrorCode.INTERNAL_ERROR, 
                message: 'Errore interno' 
            });

            gateway.handleDisconnect(mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith('exception', expect.objectContaining({
                errorCode: ErrorCode.INTERNAL_ERROR
            }));
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handleInput e Messaggi
    // ---------------------------------------------------------
    describe('handleInput', () => {
        it('dovrebbe parsare l\'input e inviarlo al GameService', () => {
            const fakeInput = { x: 1, z: 0, attackType: 'melee', playerIndex: 1 } as any;

            gateway.handleInput(mockSocket, fakeInput);

            expect(mockGameService.handleInput).toHaveBeenCalledWith(
                'fake-socket-123',
                expect.any(Vector),
                'melee',
                1
            );
        });
    });

    describe('handleGameMessage', () => {
        it('dovrebbe inviare il messaggio di gioco al GameService', () => {
            const fakeMessage = { message: 'Hello' } as any;

            gateway.handleGameMessage(mockSocket, fakeMessage);

            expect(mockGameService.processGameMessage).toHaveBeenCalledWith('fake-socket-123', 'Hello');
        });
    });
});