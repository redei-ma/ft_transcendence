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
import mapTexture from '../assets/images/mapTexture1.png';
import { useGameStore } from '../storage/gameStore';
import { useThree, useFrame } from '@react-three/fiber';
import { theme } from '../configs/theme';
import { PillarModel, WallModel } from './entities/mapModels';
import * as THREE from 'three';

interface GameProps {
  selectedCharacter: CharacterName;
  selectedMode: MatchMode;
  p1Character: CharacterName;
  p2Character: CharacterName;
  onPlayAgain: () => void;
  onQuit: () => void;
  myUserId: string;
  myUsername: string;
}

function CameraController({ mapWidth, mapDepth }: { mapWidth: number; mapDepth: number }) {
  const { camera, size } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const mapSize = Math.max(mapWidth, mapDepth);
    if (size.height < size.width) {
      camera.zoom = size.height / (mapSize * 0.82);
    } else {
      camera.zoom = size.width / (mapSize * 0.82);
    }
    camera.updateProjectionMatrix();
  }, [size, camera, mapWidth, mapDepth]);

  return null;
}

function AimPlane({ inputManagerRef, myUserId }: { inputManagerRef: React.RefObject<InputManager | null>; myUserId: string }) {
  useFrame(() => {
    const player = useGameStore.getState().gameState?.players.find(
      p => (p as any).userName === myUserId || p.id === myUserId
    );
    if (player && inputManagerRef.current) {
      inputManagerRef.current.setPlayerPosition(player.position.x, player.position.z);
    }
  });

  const handleClick = (e: any) => {
    if (!inputManagerRef.current) return;
    if (!e.nativeEvent.shiftKey) return;
    if (inputManagerRef.current.getIsLocal()) return; // Blocca in local
    e.stopPropagation();
    inputManagerRef.current.fireSpellAt(e.point.x, e.point.z);
  };

  const mapWidth = useGameStore.getState().world?.map?.width || 130;
  const mapDepth = useGameStore.getState().world?.map?.depth || 130;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[mapWidth / 2, 0, mapDepth / 2]}
      visible={false}
      onClick={handleClick}
    >
      <planeGeometry args={[mapWidth * 2, mapDepth * 2]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function ResizeWarning({ onLeave }: { onLeave: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '24px',
    }}>
      <h2 style={{
        fontFamily: '"Cinzel", serif', color: '#d44',
        fontSize: '22px', letterSpacing: '2px', textTransform: 'uppercase',
      }}>BACK TO FULL-SCREEN MODE</h2>
      <p style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: '13px',
        color: 'rgba(200,170,100,0.6)', textAlign: 'center', lineHeight: 1.6,
      }}>
        Restore the original window size or you will be kicked from the match.
      </p>
      <div style={{
        fontFamily: '"Cinzel", serif', fontSize: '48px', fontWeight: 700,
        color: countdown <= 2 ? '#d44' : '#e8d5a3',
        transition: 'color 0.3s',
      }}>{countdown}</div>
      <button onClick={onLeave} style={{
        padding: '10px 24px', background: '#d44', border: 'none',
        borderRadius: '4px', color: 'white', fontFamily: '"Cinzel", serif',
        fontSize: '12px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer',
      }}>LEAVE NOW</button>
    </div>
  );
}

export default function Game({ selectedCharacter, selectedMode, onPlayAgain, onQuit, myUserId, myUsername }: GameProps) {
  const inputManagerRef = useRef<InputManager | null>(null);
  
  useGameSocket();

  const isConnected = useGameStore((state) => state.isConnected);
  const world = useGameStore((state) => state.world);
  const gameOver = useGameStore((state) => state.gameOver);
  const resetGame = useGameStore((state) => state.resetGame);

  const playerIdsStr = useGameStore((state) => state.gameState?.players.map(p => p.id).join(',') || '');
  const bulletIdsStr = useGameStore((state) => state.gameState?.bullets.map(b => b.id).join(',') || '');

  const playerIds = useMemo(() => playerIdsStr ? playerIdsStr.split(',') : [], [playerIdsStr]);
  const bulletIds = useMemo(() => bulletIdsStr ? bulletIdsStr.split(',') : [], [bulletIdsStr]);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const isLocal = selectedMode === MatchMode.LOCAL;

  useEffect(() => {
    const inputManager = new InputManager(selectedMode === MatchMode.LOCAL);
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

  const [initialSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [resized, setResized] = useState(false);
  const handleQuitRef = useRef(handleQuitInternal);
  handleQuitRef.current = handleQuitInternal;

  useEffect(() => {
    let kickTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      const diffW = Math.abs(window.innerWidth - initialSize.w);
      const diffH = Math.abs(window.innerHeight - initialSize.h);

      if (diffW > 50 || diffH > 50) {
        setResized(true);
        if (!kickTimeout) {
          kickTimeout = setTimeout(() => {
            handleQuitRef.current();
          }, 5000);
        }
      } else {
        setResized(false);
        if (kickTimeout) {
          clearTimeout(kickTimeout);
          kickTimeout = null;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (kickTimeout) clearTimeout(kickTimeout);
    };
  }, [initialSize]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!gameOver) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameOver]);

  if (!world) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: theme.colors.bgDark,
      }}>
        <p style={{
          fontFamily: theme.fonts.heading,
          fontSize: '20px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          color: theme.colors.textSecondary,
          margin: 0,
        }}>
          Entering the Arena...
        </p>
      </div>
    );
  }

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
          near: 0.1, far: 1000,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(centerX, 0, centerZ);
          camera.updateProjectionMatrix();
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={0.8} />
        <CameraController mapWidth={mapWidth} mapDepth={mapDepth} />
        <AimPlane inputManagerRef={inputManagerRef} myUserId={myUsername} />
        <gridHelper args={[mapWidth, 20, 0xffffff, 0x444444]} position={[centerX, 0, centerZ]} />

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

        {/* {world?.map?.pillars?.map((p: any, i: number) => {
           const px = p.position?.x ?? p.x ?? 0;
           const pz = p.position?.z ?? p.z ?? 0;
           return (
             <PillarModel key={`pillar-${i}`} position={[px, 0, pz]} radius={p.radius} />
           );
         })}

         {world?.map?.walls?.map((w: any, i: number) => {
           const wx = w.position?.x ?? 0;
           const wz = w.position?.z ?? 0;
           return (
             <WallModel key={`wall-${i}`} position={[wx + w.width/2, 0, wz + w.depth/2]} width={w.width} depth={w.depth} />
           );
         })} */}

        {bulletIds.map((id) => (
          <BulletEntity key={id} bulletId={id} />
        ))}

        <EffectComposer>
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>
      
        {resized && (
          <ResizeWarning onLeave={handleQuitInternal} />
        )}

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
              Are you sure you want to leave?{!isLocal && ' This will count as a loss.'}
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
        <GameOverOverlayWrapper gameOver={gameOver} onPlayAgain={handlePlayAgainInternal} onQuit={handleQuitInternal} myUserId={myUsername} />
      )}
    </div>
  );
}

function GameOverOverlayWrapper({ gameOver, onPlayAgain, onQuit, myUserId }: {
  gameOver: any; onPlayAgain: () => void; onQuit: () => void; myUserId: string;
}) {
  const players = useGameStore((state) => state.gameState?.players) || [];
  return <GameOverOverlay gameOver={gameOver} players={players} onPlayAgain={onPlayAgain} onQuit={onQuit} myUserId={myUserId} />;
}