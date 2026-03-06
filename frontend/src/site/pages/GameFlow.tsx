import { useState, useEffect } from 'react';
import ModeSelectScene from '../../scenes/modeSelectScene';
import CharacterSelectScene from '../../scenes/characterSelectScene';
import QueueScene from '../../scenes/queueScene';
import Game from '../../game/Game';
import { socketService } from '../../services/socketServices';
import { matchmakingSocket } from '../../services/matchmakingSocket';
import { MatchMode } from '../../types/game.types';

type GameScene = 'mode-select' | 'character-select' | 'queue' | 'game';

interface GameFlowProps {
  userId: number;
  username: string;
  onExit: () => void;
}

export default function GameFlow({ userId, username, onExit }: GameFlowProps) {
  const [scene, setScene] = useState<GameScene>('mode-select');
  const [selectedMode, setSelectedMode] = useState<MatchMode>(MatchMode.RANKED);
  const [p1Character, setP1Character] = useState<'zeus' | 'ade'>('zeus');
  const [p2Character, setP2Character] = useState<'zeus' | 'ade'>('ade');

  // Connetti matchmaking socket all'ingresso nel flusso di gioco
  useEffect(() => {
    matchmakingSocket.connect();
    return () => matchmakingSocket.disconnect();
  }, []);

  const handleModeSelect = (mode: MatchMode) => {
    setSelectedMode(mode);
    setScene('character-select');
  };

  const handleCharConfirm = (p1: 'zeus' | 'ade', p2: 'zeus' | 'ade') => {
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