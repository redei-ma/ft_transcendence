import { Canvas } from '@react-three/fiber';
import { useGameSocket } from '../hooks/useGameSocket';
import { InputManager } from './input/inputManager';
import { useEffect, useRef, useMemo, useState} from 'react';
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
  
  // Il Socket Hook ora non restituisce nulla, aggiorna solo lo store
  useGameSocket();

  // Estraiamo i dati "lenti" dallo store per l'interfaccia 2D
  const isConnected = useGameStore((state) => state.isConnected);
  const world = useGameStore((state) => state.world);
  const gameOver = useGameStore((state) => state.gameOver);
  const resetGame = useGameStore((state) => state.resetGame);

  // FIX ZUSTAND v5: Estraiamo gli ID come stringa (es. "id1,id2") così non serve la funzione di comparazione!
  const playerIdsStr = useGameStore((state) => state.gameState?.players.map(p => p.id).join(',') || '');
  const bulletIdsStr = useGameStore((state) => state.gameState?.bullets.map(b => b.id).join(',') || '');

  // Ritrasformiamo la stringa in array solo se cambia
  const playerIds = useMemo(() => playerIdsStr ? playerIdsStr.split(',') : [], [playerIdsStr]);
  const bulletIds = useMemo(() => bulletIdsStr ? bulletIdsStr.split(',') : [], [bulletIdsStr]);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

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
        <button onClick={() => setShowLeaveDialog(true)} style={{
          position: 'absolute', top: 16, left: 16, zIndex: 1000,
          padding: '8px 16px', background: 'rgba(0,0,0,0.6)',
          border: '1px solid #d44', borderRadius: '4px',
          color: '#d44', fontFamily: '"Cinzel", serif',
          fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
          cursor: 'pointer', backdropFilter: 'blur(4px)',
          transition: 'all 0.2s',
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(221,68,68,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
        >LEAVE</button>
      )}

      {showLeaveDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#0d1a25', border: '1px solid #e8d5a3', borderRadius: '4px',
            padding: '32px', maxWidth: '420px', textAlign: 'center',
            boxShadow: '0 0 40px rgba(200,170,100,0.3)',
          }}>
            <h3 style={{
              fontFamily: '"Cinzel", serif', color: '#f0e0b0', fontSize: '18px',
              marginBottom: '16px', letterSpacing: '1px',
            }}>Abandon Match</h3>
            <p style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: '13px',
              color: '#e8d5a3', marginBottom: '32px', lineHeight: 1.6,
            }}>
              Are you sure you want to leave? This will count as a loss.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => setShowLeaveDialog(false)} style={{
                padding: '10px 24px', background: 'none',
                border: '1px solid rgba(200,170,100,0.15)', color: 'rgba(200,170,100,0.35)',
                cursor: 'pointer', fontFamily: '"Cinzel", serif', letterSpacing: '1px',
              }}>CANCEL</button>
              <button onClick={() => { setShowLeaveDialog(false); handleQuitInternal(); }} style={{
                padding: '10px 24px', background: '#d44', border: 'none',
                color: 'white', fontWeight: 'bold', cursor: 'pointer',
                borderRadius: '2px', fontFamily: '"Cinzel", serif', letterSpacing: '1px',
              }}>LEAVE</button>
            </div>
          </div>
        </div>
      )}

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