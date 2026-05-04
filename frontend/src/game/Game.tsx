import { Canvas } from '@react-three/fiber';
import { useGameSocket } from '../hooks/useGameSocket';
import { InputManager } from './input/inputManager';
import { useEffect, useRef, useMemo } from 'react';
import { CharacterName, MatchMode, GameConfig } from '@transcendence/types';
import GameUI from './UI/gameUI';
import { PlayerEntity } from './entities/PlayerEntity';
import { BulletEntity } from './entities/BulletEntity';
import { GameOverOverlay } from './UI/components/GameOverOverlay';
import GameChat from './UI/components/GameChat';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import mapTexture from '../assets/mapTexture1.png';
import { useGameStore } from '../storage/gameStore';

interface GameProps {
  selectedCharacter: CharacterName;
  selectedMode: MatchMode;
  p1Character: CharacterName;
  p2Character: CharacterName;
  onPlayAgain: () => void;
  onQuit: () => void;
  myUserId: string;
}

export default function Game({ selectedCharacter, selectedMode, onPlayAgain, onQuit, myUserId }: GameProps) {
  const inputManagerRef = useRef<InputManager | null>(null);
  
  // ⚡ Il Socket Hook ora non restituisce nulla, aggiorna solo lo store
  useGameSocket();

  // ⚡ Estraiamo i dati "lenti" dallo store per l'interfaccia 2D
  const isConnected = useGameStore((state) => state.isConnected);
  const world = useGameStore((state) => state.world);
  const gameOver = useGameStore((state) => state.gameOver);
  const resetGame = useGameStore((state) => state.resetGame);

  // ⚡ FIX ZUSTAND v5: Estraiamo gli ID come stringa (es. "id1,id2") così non serve la funzione di comparazione!
  const playerIdsStr = useGameStore((state) => state.gameState?.players.map(p => p.id).join(',') || '');
  const bulletIdsStr = useGameStore((state) => state.gameState?.bullets.map(b => b.id).join(',') || '');

  // ⚡ Ritrasformiamo la stringa in array solo se cambia
  const playerIds = useMemo(() => playerIdsStr ? playerIdsStr.split(',') : [], [playerIdsStr]);
  const bulletIds = useMemo(() => bulletIdsStr ? bulletIdsStr.split(',') : [], [bulletIdsStr]);

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

  const handlePlayAgainInternal = () => {
    resetGame();
    onPlayAgain();
  };

  const handleQuitInternal = () => {
    resetGame();
    onQuit();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundImage: `url(${mapTexture})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat', overflow: 'hidden',
    }}>
      <Canvas
        orthographic
        camera={{
          position: [centerX + 80, 100, centerZ + 80],
          zoom: 5, near: 0.1, far: 1000,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(centerX, 0, centerZ);
          camera.updateProjectionMatrix();
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={0.8} />

        <gridHelper args={[mapWidth, 20, 0xffffff, 0x444444]} position={[centerX, 0, centerZ]} />

        {/* I componenti 3D estraggono i loro dati live da Zustand usando questi ID */}
        {playerIds.map((id) => (
          <PlayerEntity key={id} playerId={id} />
        ))}

        {world?.map?.pillars?.map((p: any, i: number) => {
        const px = p.position?.x ?? p.x ?? 0;
        const pz = p.position?.z ?? p.z ?? 0;
        return (
          <mesh 
            key={`pillar-${i}`} 
            position={[px, 2.5, pz]}
          >
            <cylinderGeometry args={[p.radius, p.radius, 5, 16]} />
            <meshStandardMaterial 
              color="#1a1a2e" 
              emissive="#d4af37" 
              emissiveIntensity={0.1}
              transparent 
              opacity={0.7} 
            />
          </mesh>
        );
        })}

        {world?.map?.walls?.map((w: any, i: number) => {
          const wx = w.position?.x ?? 0;
          const wz = w.position?.z ?? 0;
          return (
            <mesh 
              key={`wall-${i}`} 
              position={[wx + w.width/2, 2.5, wz + w.depth/2]}
            >
              <boxGeometry args={[w.width, 5, w.depth]} />
              <meshStandardMaterial color="#1a1a2e" transparent opacity={0.6} />
            </mesh>
          );
        })}
        
        {bulletIds.map((id) => (
          <BulletEntity key={id} bulletId={id} />
        ))}

        <EffectComposer>
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>

      {!gameOver && (
        <GameUI
          character={selectedCharacter}
          isConnected={isConnected}
          mapData={world}
          maxPlayers={world?.map?.maxPlayers || 2}
          gameOver={gameOver}
        />
      )}

      {!gameOver && (selectedMode === MatchMode.RANKED || selectedMode === MatchMode.UNRANKED) && (
        <GameChat myUserId={myUserId} isVisible={true} />
      )}

      {gameOver && (
        <GameOverOverlayWrapper gameOver={gameOver} onPlayAgain={handlePlayAgainInternal} onQuit={handleQuitInternal} />
      )}
    </div>
  );
}

function GameOverOverlayWrapper({ gameOver, onPlayAgain, onQuit }: {
  gameOver: any; onPlayAgain: () => void; onQuit: () => void;
}) {
  const players = useGameStore((state) => state.gameState?.players) || [];
  return <GameOverOverlay gameOver={gameOver} players={players} onPlayAgain={onPlayAgain} onQuit={onQuit} />;
}