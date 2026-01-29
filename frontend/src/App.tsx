/* import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Clash of Olympus
        </h1>
        <p className="text-gray-400 mb-4">Frontend - Ready to Build</p>
        <button
          onClick={() => setCount(count + 1)}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Count: {count}
        </button>
      </div>
    </div>
  )
} */

/* import Game from './game/Game';

function App() {
  return <Game />;
}

export default App; */

import { useState } from 'react';
import WelcomeScene from './scenes/welcomeScene';
import CharacterSelectScene from './scenes/characterSelectScene';
import Game from './game/Game';

type Scene = 'welcome' | 'character-select' | 'game';

function App() {
  const [currentScene, setCurrentScene] = useState<Scene>('welcome');
  const [selectedCharacter, setSelectedCharacter] = useState<'Zeus' | 'Ade' | null>(null);

  const handleStart = () => {
    setCurrentScene('character-select');
  };

  const handleCharacterSelect = (character: 'Zeus' | 'Ade') => {
    setSelectedCharacter(character);
    setCurrentScene('game');
  };

  if (currentScene === 'welcome') {
    return <WelcomeScene onStart={handleStart} />;
  }

  if (currentScene === 'character-select') {
    return <CharacterSelectScene onCharacterSelect={handleCharacterSelect} />;
  }

  return <Game selectedCharacter={selectedCharacter!} />;
}

export default App;