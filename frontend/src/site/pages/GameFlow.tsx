import { useState, useEffect, useRef } from 'react';
import ModeSelectScene from '../../scenes/modeSelectScene';
import CharacterSelectScene from '../../scenes/characterSelectScene';
import QueueScene from '../../scenes/queueScene';
import Game from '../../game/Game';
import { socketService } from '../../services/socketServices';
import { matchmakingSocket } from '../../services/matchmakingSocket';
import { CharacterName, MatchMode, GameEvents } from '@transcendence/types';
import { theme } from '../../configs/theme';
import { logger } from '../../configs/logger';

type GameScene = 'mode-select' | 'character-select' | 'queue' | 'game';

type MatchFoundData = { status?: string; message?: string; matchId?: string };

interface GameFlowProps {
  userId: number;
  username: string;
  onExit: () => void;
  sessionId?: string | null;
  inviterId?: number | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Session expired. Please login again.',
  UNAUTHORIZED_TOKEN: 'Session expired. Please login again.',
  PLAYER_NOT_FOUND: 'You are not in the game list.',
  SESSION_NOT_FOUND: 'Game session not found.',
  MATCH_ALREADY_STARTED: 'This match has already started.',
  SERVER_SHUTDOWN: 'The game server is shutting down.',
  INTERNAL_ERROR: 'An internal server error occurred.',
  MAP_LOAD_FAILED: 'Failed to load the game map.',
};

// GameFlow: state machine delle scene pre-partita (mode-select → character-select → queue → game).
// Gestisce il ciclo di vita completo dei due socket: matchmakingSocket (connesso qui)
// e socketService (connesso solo quando MATCH_FOUND arriva, non prima).
export default function GameFlow({ userId, username, onExit, sessionId: initialSessionId, inviterId }: GameFlowProps) {
  // Se si arriva con sessionId (invito accettato), si salta mode-select e si va direttamente a character-select
  // Se si arriva con sessionId (invito accettato), si salta mode-select e si va direttamente a character-select
  const [scene, setScene] = useState<GameScene>(initialSessionId ? 'character-select' : 'mode-select'); // useState: controlla quale scena renderizzare — ogni cambio causa re-render
  const [selectedMode, setSelectedMode] = useState<MatchMode>(initialSessionId ? MatchMode.UNRANKED : MatchMode.RANKED);
  const [p1Character, setP1Character] = useState<CharacterName>(CharacterName.ZEUS);
  const [p2Character, setP2Character] = useState<CharacterName>(CharacterName.ADE);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isReconnecting, setIsReconnecting] = useState(false); // useState: mostra/nasconde l'overlay di riconnessione — deve causare re-render
  // Ref (non state): impedisce che un MATCH_FOUND in ritardo riconnetta alla partita dopo LEAVE_GAME
  const hasResignedRef = useRef(false); // useRef: flag booleano letto dentro callback socket — non serve un re-render quando cambia
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // Monta il socket matchmaking e ascolta MATCH_FOUND / DIRECT_SESSION_READY.
  // socketService (game socket) viene connesso solo all'interno di handleMatchFound, non al mount.
  useEffect(() => {
    matchmakingSocket.connect();
    // MATCH_FOUND: avvia il game socket e transita a 'game'.
    // Se si era già in 'game' (ricarica pagina), ignora. Se non si era in 'queue' (riconnessione), attende 3s.
    const handleMatchFound = (data: MatchFoundData) => {
      logger.debug("GameFlow", "MATCH_FOUND data:", JSON.stringify(data));
      if (hasResignedRef.current) return;
        
      if (data?.status === 'MATCH_CANCELLED') {
        setCancelMessage(data?.message || "L'avversario ha abbandonato. Partita annullata.");
        setTimeout(() => onExit(), 3000);
        return;
      }
      // Deduce il matchMode dal matchId per la riconnessione
      if (data?.matchId) {
        if (data.matchId.startsWith('local_')) {
          setSelectedMode(MatchMode.LOCAL);
        } else if (data.matchId.startsWith('ai_')) {
          setSelectedMode(MatchMode.AI);
        }
      }
      
      setScene((prevScene) => {
        if (prevScene === 'game') return prevScene;
        if (prevScene !== 'queue') {
          setIsReconnecting(true);
          setTimeout(() => {
            socketService.connect('/', String(userId));
            setIsReconnecting(false);
            setScene('game');
          }, 3000);
          return prevScene;
        }
        socketService.connect('/', String(userId));
        return 'game';
      });
    };

    // SENDER: Matchamking ci avvisa che l'invitato ha accettato
    const handleDirectSessionReady = (data: { sessionId?: string }) => {
      logger.debug("GameFlow", "DIRECT_SESSION_READY:", data);
      if (data?.sessionId) {
        setSessionId(data.sessionId);
        setSelectedMode(MatchMode.UNRANKED);
        setScene('character-select');
      }
    };

    matchmakingSocket.on(GameEvents.MATCH_FOUND, handleMatchFound);
    matchmakingSocket.on(GameEvents.DIRECT_SESSION_READY, handleDirectSessionReady);

    return () => {
      matchmakingSocket.off(GameEvents.MATCH_FOUND, handleMatchFound);
      matchmakingSocket.off(GameEvents.DIRECT_SESSION_READY, handleDirectSessionReady);
      matchmakingSocket.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    const handleError = (code: string, message: string) => {
      if (code === 'INVALID_INPUT') {
        logger.warn('GameFlow', `Invalid input: ${message}`);
        return;
      }
      const display = ERROR_MESSAGES[code] || message || 'Unknown error';
      alert(display);
      socketService.disconnect();
      matchmakingSocket.disconnect();
      if (code === 'UNAUTHORIZED' || code === 'UNAUTHORIZED_TOKEN') {
        window.location.reload();
      } else {
        onExit();
      }
    };

    socketService.setOnGameError(handleError);
    matchmakingSocket.setOnMatchError(handleError);

    return () => {
      socketService.setOnGameError(null);
      matchmakingSocket.setOnMatchError(null);
    };
  }, [onExit]);

  const handleModeSelect = (mode: MatchMode) => {
    setSelectedMode(mode);
    setScene('character-select');
  };

  const handleCharConfirm = (p1: CharacterName, p2: CharacterName) => {
    setP1Character(p1);
    setP2Character(p2);
    setScene('queue');
  };

  const handlePlayAgain = () => {
    socketService.disconnect();
    matchmakingSocket.connect();
    setSessionId(null);
    setScene('mode-select');
  };

  const handleQuit = (isGameOver = false) => {
    hasResignedRef.current = true;
    
    const cleanup = () => {
      socketService.disconnect();
      matchmakingSocket.disconnect();
      onExit();
    };
  
    // A game over la sessione è già in stato END: niente LEAVE_GAME, solo cleanup.
    if (isGameOver) {
      cleanup();
      return;
    }
  
    // Invia LEAVE_GAME con callback ack per cleanup ordinato; safety timeout di 1s in caso di ack perso.
    const safetyTimeout = setTimeout(() => {
      logger.warn('GameFlow', 'LEAVE_GAME ack timeout — cleanup forzato');
      cleanup();
    }, 1000);

    socketService.emit(
      GameEvents.LEAVE_GAME,
      { userId: String(userId) },
      (response) => {
        clearTimeout(safetyTimeout);
        if (response.status === 'success') {
          logger.debug('GameFlow', 'Leave confermato:', response.message);
        } else {
          logger.warn('GameFlow', `Leave fallito [${response.errorCode}]:`, response.message);
        }
        cleanup();
      }
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
      
      {isReconnecting && (
        <div className="animate-fadeIn" style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(10, 15, 25, 0.90)', backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            padding: '40px 60px',
            background: theme.colors.bgPanel,
            border: `1px solid ${theme.colors.gold}`,
            borderRadius: '4px',
            textAlign: 'center',
            boxShadow: `0 0 50px ${theme.colors.goldGlow}`
          }}>
            <h2 style={{
              fontFamily: theme.fonts.heading, color: theme.colors.goldBright,
              fontSize: '24px', letterSpacing: '2px', marginBottom: '16px',
              textTransform: 'uppercase'
            }}>Match In Corso</h2>
            <p style={{
              fontFamily: theme.fonts.mono, color: theme.colors.textPrimary,
              fontSize: '14px', lineHeight: 1.6
            }}>
              Stavi gia' partecipando ad una partita.<br/>
              <span style={{ color: theme.colors.gold, marginTop: '12px', display: 'block', animation: 'pulse 1.5s infinite', fontWeight: 'bold' }}>
                Riconnessione in corso . . .
              </span>
            </p>
          </div>
        </div>
      )}

      {cancelMessage && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(10, 15, 25, 0.90)', backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            padding: '40px 60px', background: theme.colors.bgPanel,
            border: `1px solid ${theme.colors.dead}`, borderRadius: '4px',
            textAlign: 'center', boxShadow: '0 0 50px rgba(221,68,68,0.3)',
          }}>
            <h2 style={{
              fontFamily: theme.fonts.heading, color: theme.colors.dead,
              fontSize: '20px', letterSpacing: '2px', marginBottom: '16px',
              textTransform: 'uppercase',
            }}>Match Cancelled</h2>
            <p style={{
              fontFamily: theme.fonts.mono, color: theme.colors.textPrimary,
              fontSize: '13px', lineHeight: 1.6,
            }}>{cancelMessage}</p>
          </div>
        </div>
      )}

      {scene === 'mode-select' && (
        <ModeSelectScene onModeSelect={handleModeSelect} onBack={onExit} />
      )}

      {scene === 'character-select' && (
        <CharacterSelectScene
          mode={selectedMode}
          userDbId={String(userId)}
          onConfirm={handleCharConfirm}
          onBack={() => {
            if (sessionId) {
              matchmakingSocket.emit(GameEvents.CANCEL_DIRECT_SESSION, { sessionId });
              onExit();
            } else {
              setScene('mode-select');
            }
          }}
          sessionId={sessionId}
        />
      )}

      {scene === 'queue' && (
        <QueueScene onCancel={() => {
          matchmakingSocket.emit(GameEvents.LEAVE_QUEUE, {});
          setScene('character-select');
        }} />
      )}

      {scene === 'game' && (
        <Game
          selectedCharacter={p1Character}
          selectedMode={selectedMode}
          p1Character={p1Character}
          p2Character={p2Character}
          onPlayAgain={handlePlayAgain}
          onQuit={handleQuit}
          myUserId={String(userId)}
          myUsername={username}
        />
      )}
    </div>
  );
}