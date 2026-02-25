import { useState, useEffect } from 'react';
import { matchmakingSocket } from './services/matchmakingSocket';
import { socketService } from './services/socketServices';
import { GameEvents } from './game/game.events';
import WelcomeScene from './scenes/welcomeScene';
import ModeSelectScene from './scenes/modeSelectScene';
import CharacterSelectScene from './scenes/characterSelectScene';
import QueueScene from './scenes/queueScene';
import Game from './game/Game';
import { MatchMode } from './types/game.types';

type Scene = 'welcome' | 'mode-select' | 'character-select' | 'queue' | 'game';

function App() {
  const [currentScene, setCurrentScene] = useState<Scene>('welcome');
  const [selectedMode, setSelectedMode] = useState<MatchMode | null>(null);
  const [selectedCharacterP1, setSelectedCharacterP1] = useState<'zeus' | 'ade'>('zeus');
  const [selectedCharacterP2, setSelectedCharacterP2] = useState<'zeus' | 'ade'>('ade');
  const [userDbId] = useState(() => Math.random().toString(36).substring(2, 10));
  useEffect(() => {
    if (currentScene !== 'character-select' && currentScene !== 'queue') return;

    const socket = matchmakingSocket.connect();

  const handleMatchFound = () => {
    console.log('[App] MATCH_FOUND received — connecting to Giovanni');
    socketService.connect('http://localhost:3000', userDbId);
    matchmakingSocket.disconnect();
    setCurrentScene('game');
  };

    matchmakingSocket.on(GameEvents.MATCH_FOUND, handleMatchFound);

    return () => {
      matchmakingSocket.off(GameEvents.MATCH_FOUND, handleMatchFound);
    };
  }, [currentScene]);

  const handleModeSelect = (mode: MatchMode) => {
    setSelectedMode(mode);
    setCurrentScene('character-select');
  };

  const handleCharacterConfirm = (p1: 'zeus' | 'ade', p2: 'zeus' | 'ade') => {
    setSelectedCharacterP1(p1);
    setSelectedCharacterP2(p2);

    // LOCAL e AI: Leonardo risponde subito, MATCH_FOUND arriverà quasi istantaneamente
    // RANKED e UNRANKED: mostra la coda
    if (selectedMode === MatchMode.RANKED || selectedMode === MatchMode.UNRANKED) {
      setCurrentScene('queue');
    }
    // Per LOCAL/AI non cambiamo scena qui — MATCH_FOUND la cambierà
  };

  const handleQueueCancel = () => {
    matchmakingSocket.disconnect();
    setCurrentScene('mode-select');
  };

  if (currentScene === 'welcome') {
    return <WelcomeScene onStart={() => setCurrentScene('mode-select')} />;
  }

  if (currentScene === 'mode-select') {
    return (
      <ModeSelectScene
        onModeSelect={handleModeSelect}
        onBack={() => setCurrentScene('welcome')}
      />
    );
  }

  if (currentScene === 'character-select') {
    return (
      <CharacterSelectScene
        mode={selectedMode!}
        userDbId={userDbId}
        onConfirm={handleCharacterConfirm}
        onBack={() => {
          matchmakingSocket.disconnect();
          setCurrentScene('mode-select');
        }}
      />
    );
  }

  if (currentScene === 'queue') {
    return (
      <QueueScene
        onMatchFound={() => {}} // gestito dal listener globale in App
        onCancel={handleQueueCancel}
      />
    );
  }

  return (
    <Game
      selectedCharacter={selectedCharacterP1}
      selectedMode={selectedMode!}
      p1Character={selectedCharacterP1}
      p2Character={selectedCharacterP2}
    />
  );
}

export default App;