// import { useState, useEffect } from 'react';
// import { socketService } from './services/socketServices';
// import WelcomeScene from './scenes/welcomeScene';
// import CharacterSelectScene from './scenes/characterSelectScene';
// import Game from './game/Game';

// type Scene = 'welcome' | 'character-select' | 'game';

// function App() {
//   const [currentScene, setCurrentScene] = useState<Scene>('welcome');
//   const [selectedCharacter, setSelectedCharacter] = useState<'zeus' | 'ade' | null>(null);
//   const [isSocketReady, setIsSocketReady] = useState(false);

//   useEffect(() => {
//     const SERVER_URL = 'http://localhost:3000';
//     const socket = socketService.connect(SERVER_URL);

//     const handleConnect = () => {
//       console.log('Socket ready in App');
//       setIsSocketReady(true);
//     };

//     socket.on('connect', handleConnect);

//     return () => {
//       socket.off('connect', handleConnect);
//       socketService.disconnect();
//     };
//   }, []);

//   const handleStart = () => {
//     setCurrentScene('character-select');
//   };

//   const handleCharacterSelect = (character: 'zeus' | 'ade') => {
//     setSelectedCharacter(character);
//     setCurrentScene('game');
//   };

//   if (currentScene === 'welcome') {
//     return <WelcomeScene onStart={handleStart} />;
//   }

//   if (currentScene === 'character-select') {
//     return (
//       <CharacterSelectScene
//         onCharacterSelect={handleCharacterSelect}
//         isSocketReady={isSocketReady}
//       />
//     );
//   }

//   return <Game selectedCharacter={selectedCharacter!} />;
// }

// export default App;
import { useState, useEffect } from 'react';
import { socketService } from './services/socketServices';
import WelcomeScene from './scenes/welcomeScene';
import ModeSelectScene from './scenes/modeSelectScene';
import CharacterSelectScene from './scenes/characterSelectScene';
import Game from './game/Game';
import { MatchMode } from './types/game.types';

type Scene = 'welcome' | 'mode-select' | 'character-select' | 'game';

function App() {
  const [currentScene, setCurrentScene] = useState<Scene>('welcome');
  const [selectedMode, setSelectedMode] = useState<MatchMode | null>(null);
  const [selectedCharacterP1, setSelectedCharacterP1] = useState<'zeus' | 'ade'>('zeus');
  const [selectedCharacterP2, setSelectedCharacterP2] = useState<'zeus' | 'ade'>('ade');
  const [isSocketReady, setIsSocketReady] = useState(false);

  useEffect(() => {
    const SERVER_URL = 'http://localhost:3000';
    const socket = socketService.connect(SERVER_URL);

    const handleConnect = () => setIsSocketReady(true);
    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socketService.disconnect();
    };
  }, []);

  const handleModeSelect = (mode: MatchMode) => {
    setSelectedMode(mode);
    setCurrentScene('character-select');
  };

  const handleCharacterConfirm = (p1: 'zeus' | 'ade', p2: 'zeus' | 'ade') => {
    setSelectedCharacterP1(p1);
    setSelectedCharacterP2(p2);
    setCurrentScene('game');
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
        isSocketReady={isSocketReady}
        onConfirm={handleCharacterConfirm}
        onBack={() => setCurrentScene('mode-select')}
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