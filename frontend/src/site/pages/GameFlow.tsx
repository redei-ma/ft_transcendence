import { useState, useEffect } from 'react';
import ModeSelectScene from '../../scenes/modeSelectScene';
import CharacterSelectScene from '../../scenes/characterSelectScene';
import QueueScene from '../../scenes/queueScene';
import Game from '../../game/Game';
import { socketService } from '../../services/socketServices';
import { matchmakingSocket } from '../../services/matchmakingSocket';
import { CharacterName, MatchMode } from '@transcendence/types';

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

  useEffect(() => {
    matchmakingSocket.connect();
    return () => matchmakingSocket.disconnect();
  }, []);

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

  const handleMatchFound = () => {
    socketService.connect('/', String(userId));
    setScene('game');
  };

  const handlePlayAgain = () => {
    socketService.disconnect();
    matchmakingSocket.connect();
    setScene('mode-select');
  };

  const handleQuit = () => {
    socketService.disconnect();
    matchmakingSocket.disconnect();
    onExit();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>

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
          onMatchFound={handleMatchFound}
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