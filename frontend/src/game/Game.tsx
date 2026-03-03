import { Canvas } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { useGameSocket } from '../hooks/useGameSocket';
import { InputManager } from './input/inputManager';
import { useEffect, useRef } from 'react';
import { GameConfig } from '../configs/config';
import { MatchMode } from '../types/game.types';
import GameUI from './UI/gameUI';
import { PlayerEntity } from './entities/PlayerEntity';
import { BulletEntity } from './entities/BulletEntity';
import { GameOverOverlay } from './UI/components/GameOverOverlay';
import GameChat  from './UI/components/GameChat';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import mapTexture from '../assets/mapTexture.png';

interface GameProps {
  selectedCharacter: 'zeus' | 'ade';
  selectedMode: MatchMode;
  p1Character: 'zeus' | 'ade';
  p2Character: 'zeus' | 'ade';
  onPlayAgain: () => void;
  onQuit: () => void;
  myUserId: string,
}

export default function Game({ selectedCharacter, selectedMode, onPlayAgain, onQuit, myUserId }: GameProps) {
  const inputManagerRef = useRef<InputManager | null>(null);
  const { isConnected, world, gameState, gameOver } = useGameSocket();

  useEffect(() => {
    const isLocal = selectedMode === MatchMode.LOCAL;
    const inputManager = new InputManager(isLocal);
    inputManagerRef.current = inputManager;

    return () => {
      inputManager.dispose();
      inputManagerRef.current = null;
    };
  }, [selectedMode]);

  const mapWidth = world?.map?.width || GameConfig.MAP.WIDTH;
  const mapDepth = world?.map?.depth || GameConfig.MAP.DEPTH;
  const centerX = mapWidth / 2;
  const centerZ = mapDepth / 2;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `url(${mapTexture})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      overflow: 'hidden',
    }}>
      <Canvas
        orthographic
        camera={{
          position: [centerX + 80, 100, centerZ + 80],
          zoom: 5,
          near: 0.1,
          far: 1000,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(centerX, 0, centerZ);
          camera.updateProjectionMatrix();
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={0.8} />

        <gridHelper
            args={[mapWidth, 20, 0xffffff, 0x444444]}
            position={[centerX, 0, centerZ]}
        />

        <gridHelper
          args={[mapWidth, 20, 0xffffff, 0x444444]}
          position={[centerX, 0, centerZ]}
        />

        {gameState?.players.map((player) => (
          <PlayerEntity key={player.id} snapshot={player} />
        ))}

        {gameState?.bullets.map((bullet) => (
          <BulletEntity key={bullet.id} snapshot={bullet} />
        ))}

        <EffectComposer>
          <Bloom
            luminanceThreshold={1}
            luminanceSmoothing={0.9}
            mipmapBlur
            intensity={1.5}
          />
        </EffectComposer>
      </Canvas>

      {!gameOver && (
        <GameUI
          character={selectedCharacter}
          isConnected={isConnected}
          mapData={world}
          playersCount={gameState?.players.length || 0}
          maxPlayers={world?.map?.maxPlayers || 2}
          gameOver={gameOver}
          gameState={gameState}
        />
      )}

      {!gameOver && (selectedMode === MatchMode.RANKED || selectedMode === MatchMode.UNRANKED) && (
        <GameChat
          myUserId={myUserId}
          isVisible={true}
        />
      )}

      {gameOver && gameState && (
        <GameOverOverlay
          gameOver={gameOver}
          players={gameState.players}
          onPlayAgain={onPlayAgain}
          onQuit={onQuit}
        />
      )}
    </div>
  );
}