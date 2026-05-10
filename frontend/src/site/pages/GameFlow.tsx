import ModeSelectScene from '../../scenes/modeSelectScene';
import CharacterSelectScene from '../../scenes/characterSelectScene';
import QueueScene from '../../scenes/queueScene';
import Game from '../../game/Game';
import { socketService } from '../../services/socketServices';
import { matchmakingSocket } from '../../services/matchmakingSocket';
import { CharacterName, MatchMode, GameEvents } from '@transcendence/types';
import { theme } from '../../configs/theme';
import { useState, useEffect, useRef } from 'react';

type GameScene = 'mode-select' | 'character-select' | 'queue' | 'game';

interface GameFlowProps {
  userId: number;
  username: string;
  onExit: () => void;
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

export default function GameFlow({ userId, username, onExit }: GameFlowProps) {
  const [scene, setScene] = useState<GameScene>('mode-select');
  const [selectedMode, setSelectedMode] = useState<MatchMode>(MatchMode.RANKED);
  const [p1Character, setP1Character] = useState<CharacterName>(CharacterName.ZEUS);
  const [p2Character, setP2Character] = useState<CharacterName>(CharacterName.ADE);
  
  // Stato per la schermata di riconnessione
  const [isReconnecting, setIsReconnecting] = useState(false);
  const hasResignedRef = useRef(false);
  useEffect(() => {
    matchmakingSocket.connect();

    // Ascolto GLOBALE dell'evento MATCH_FOUND
    const handleMatchFound = () => {
      if (hasResignedRef.current) return;
      setScene((prevScene) => {
        // 1. Se siamo già in gioco, ignoriamo l'evento per non interrompere la partita!
        if (prevScene === 'game') {
          return prevScene;
        }

        // 2. Se riceviamo MATCH_FOUND ma non stavamo cercando partita (queue),
        // significa che il server ci sta riconnettendo a una partita in corso!
        if (prevScene !== 'queue') {
          setIsReconnecting(true);
          
          // Attendiamo 3 secondi per mostrare il messaggio all'utente
          setTimeout(() => {
            socketService.connect('/', String(userId));
            setIsReconnecting(false);
            setScene('game');
          }, 3000);
          
          return prevScene; // Manteniamo la scena visiva attuale sotto l'overlay
        } 
        
        // 3. Flusso normale: eravamo in coda e abbiamo trovato partita
        socketService.connect('/', String(userId));
        return 'game';
      });
    };

    matchmakingSocket.on(GameEvents.MATCH_FOUND, handleMatchFound);

    return () => {
      matchmakingSocket.off(GameEvents.MATCH_FOUND, handleMatchFound);
      matchmakingSocket.disconnect();
    };
  }, [userId]);

  // Registra handler errori da entrambi i socket
  useEffect(() => {
    const handleError = (code: string, message: string) => {
      if (code === 'INVALID_INPUT') {
        console.warn(`[GameFlow] Invalid input: ${message}`);
        return;
      }
      const display = ERROR_MESSAGES[code] || message || 'Unknown error';
      alert(display);
      socketService.disconnect();
      matchmakingSocket.disconnect();
      onExit();
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
    setScene('mode-select');
  };

  const handleQuit = () => {
    hasResignedRef.current = true;
    matchmakingSocket.emit(GameEvents.LEAVE_GAME, {userId: String(userId) });
    socketService.disconnect();
    matchmakingSocket.disconnect();
    onExit();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
      
      {/* OVERLAY RICONNESSIONE */}
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
            }}>
              Match In Corso
            </h2>
            <p style={{
              fontFamily: theme.fonts.mono, color: theme.colors.textPrimary,
              fontSize: '14px', lineHeight: 1.6
            }}>
              Stavi gia' partecipando ad una partita.
              <br/>
              <span style={{ 
                color: theme.colors.gold, marginTop: '12px', display: 'block', 
                animation: 'pulse 1.5s infinite', fontWeight: 'bold' 
              }}>
                Riconnessione in corso . . .
              </span>
            </p>
          </div>
        </div>
      )}

      {scene === 'mode-select' && (
        <ModeSelectScene
          onModeSelect={handleModeSelect}
          onBack={onExit}
        />
      )}

      {scene === 'character-select' && (
        <CharacterSelectScene
          mode={selectedMode}
          userDbId={String(userId)}
          onConfirm={handleCharConfirm}
          onBack={() => setScene('mode-select')}
        />
      )}

      {scene === 'queue' && (
        <QueueScene
          onCancel={() => {
            matchmakingSocket.disconnect();
            matchmakingSocket.connect();
            setScene('character-select');
          }}
        />
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
        />
      )}

    </div>
  );
}