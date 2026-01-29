

import { useEffect, useRef } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { GameScene } from './core/gameScene';
import { GameCamera } from './core/gameCamera';
import GameUI from './UI/gameUI';

interface GameProps {
  selectedCharacter: 'Zeus' | 'Ade';
}

export default function Game({ selectedCharacter }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameSceneRef = useRef<GameScene | null>(null);
  const gameCameraRef = useRef<GameCamera | null>(null);

  const SERVER_URL = 'http://localhost:3000'; // ⭐ Porta Giovanni
  const { isConnected, mapData, gameState, gameOver } = useGameSocket(SERVER_URL);

  // Setup scena
  useEffect(() => {
    if (!containerRef.current) return;

    const gameScene = new GameScene(containerRef.current);
    const gameCamera = new GameCamera();

    gameSceneRef.current = gameScene;
    gameCameraRef.current = gameCamera;

    gameScene.startLoop((delta) => {
      gameScene.renderer.render(gameScene.scene, gameCamera.camera);
    });

    return () => {
      gameScene.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      <GameUI
        character={selectedCharacter}
        isConnected={isConnected}
        mapData={mapData}
        playersCount={gameState?.players.length || 0}
        maxPlayers={2}
        gameOver={gameOver}
      />
    </div>
  );
}