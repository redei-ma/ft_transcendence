import { CharacterName, MatchMode, GameConfig } from '@transcendence/types';
import { GameOverPayload, MapEmitPayload } from '../types/game.types';
import { theme } from '../configs/theme';

import { useEffect, useRef, useMemo, useState} from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import mapTexture from '../assets/images/mapTexture1.png';

import { useGameStore } from '../storage/gameStore';
import { useGameSocket } from '../hooks/useGameSocket';
import { useFullscreenGuard } from '../hooks/useFullscreenGuard';

import { PlayerEntity } from './entities/PlayerEntity';
import { BulletEntity } from './entities/BulletEntity';
import { InputManager } from './input/inputManager';
import { GameOverOverlay } from './UI/components/GameOverOverlay';
import GameChat from './UI/components/GameChat';
import GameUI from './UI/gameUI';
import { PillarModel, WallModel } from './entities/mapModels';
import SkillHud from './UI/components/SkillHud';
import { FullscreenGate } from '../site/components/FullscreenGate';



interface GameProps {
  selectedCharacter: CharacterName;
  selectedMode: MatchMode;
  p1Character: CharacterName;
  p2Character: CharacterName;
  onPlayAgain: () => void;
  onQuit: (isGameOver?: boolean) => void;
  myUserId: string;
  myUsername: string;
}

function CameraController({ mapWidth, mapDepth }: { mapWidth: number; mapDepth: number }) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (size.width === 0 || size.height === 0) return; // Skip se size non è ancora valido

    const mapSize = Math.max(mapWidth, mapDepth);
    if (size.height < size.width) {
      camera.zoom = size.height / (mapSize * 0.82);
    } else {
      camera.zoom = size.width / (mapSize * 0.82);
    }
    camera.updateProjectionMatrix();
  }, [size.width, size.height, camera, mapWidth, mapDepth]);

  return null;
}

function AimPlane({ inputManagerRef, myUserId }: { inputManagerRef: React.RefObject<InputManager | null>; myUserId: string }) {
  useFrame(() => {
    const player = useGameStore.getState().gameState?.players.find(
      p => p.userName === myUserId || p.id === myUserId
    );
    if (player && inputManagerRef.current) {
      inputManagerRef.current.setPlayerPosition(player.position.x, player.position.z);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
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

export default function Game({ selectedCharacter, selectedMode, p1Character, p2Character, onPlayAgain, onQuit, myUserId, myUsername }: GameProps) {
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
  const isLocal = selectedMode === MatchMode.LOCAL || selectedMode === MatchMode.AI;
  const doubleHUD = selectedMode === MatchMode.LOCAL;
  
  const { isFullscreen, enter } = useFullscreenGuard(
    !gameOver,
    () => handleQuitInternal(false),
  );

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

  const handleQuitInternal = (isGameOver = false) => {
    resetGame();
    onQuit(isGameOver);
  };

  const handleQuitRef = useRef(handleQuitInternal);
  handleQuitRef.current = handleQuitInternal;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!gameOver) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameOver]);

  if (!isFullscreen) {
    return (
        <FullscreenGate
          onEnter={enter}
          onLeave={() => handleQuitInternal(false)}
        />
      );
    }

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

        {playerIds.map((id) => (
          <PlayerEntity key={id} playerId={id} />
        ))}

        {/* {world?.map?.pillars?.map((p: MapEmitPayload['map']['pillars'][number], i: number) => {
        const px = p.position?.x ?? 0;
        const pz = p.position?.z ?? 0;
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
        })} */}

        {/* {world?.map?.pillars?.map((p: MapEmitPayload['map']['pillars'][number], i: number) => {
           const px = p.position?.x ?? 0;
           const pz = p.position?.z ?? 0;
           return (
             <PillarModel key={`pillar-${i}`} position={[px, 0, pz]} radius={p.radius} />
           );
         })} */}

         {world?.map?.walls?.map((w: MapEmitPayload['map']['walls'][number], i: number) => {
           const wx = w.position?.x ?? 0;
           const wz = w.position?.z ?? 0;
           return (
             <WallModel key={`wall-${i}`} position={[wx + w.width/2, 0, wz + w.depth/2]} width={w.width} depth={w.depth} />
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
              Are you sure you want to leave?{!isLocal && ' This will count as a loss.'}
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => setShowLeaveDialog(false)} style={{
                padding: '10px 24px', background: 'none',
                border: '1px solid rgba(200,170,100,0.15)', color: 'rgba(200,170,100,0.35)',
                cursor: 'pointer', fontFamily: '"Cinzel", serif', letterSpacing: '1px',
              }}>CANCEL</button>
              <button onClick={() => { setShowLeaveDialog(false); handleQuitInternal(false); }} style={{
                padding: '10px 24px', background: '#d44', border: 'none',
                color: 'white', fontWeight: 'bold', cursor: 'pointer',
                borderRadius: '2px', fontFamily: '"Cinzel", serif', letterSpacing: '1px',
              }}>LEAVE</button>
            </div>
          </div>
        </div>
      )}

      {/* {!gameOver && (
        <GameUI
          character={selectedCharacter}
          isConnected={isConnected}
          mapData={world}
          maxPlayers={world?.map?.maxPlayers || 2}
          gameOver={gameOver}
        />
      )} */}

      {!gameOver && (selectedMode === MatchMode.RANKED || selectedMode === MatchMode.UNRANKED) && (
        <GameChat myUserId={myUserId} isVisible={true} />
      )}

      {!gameOver && (
  <>
    <SkillHud                                            //Visualizza il componente SkillHUD
          character={p1Character}
          myUserId={myUserId}
          myUsername={myUsername}
          teamId={doubleHUD ? 0 : undefined}
          side="left"
        />
        {doubleHUD && (                                  //Se si e' in local abilita la doppia HUD
          <SkillHud
            character={p2Character}
            myUserId=""
            myUsername=""
            teamId={1}
            side="right"
          />
        )}
      </>
    )}

      {gameOver && (
        <GameOverOverlayWrapper gameOver={gameOver} onPlayAgain={handlePlayAgainInternal} onQuit={ () => handleQuitInternal(true)} myUserId={myUsername} />
      )}
    </div>
  );
}

function GameOverOverlayWrapper({ gameOver, onPlayAgain, onQuit, myUserId }: {
  gameOver: GameOverPayload; onPlayAgain: () => void; onQuit: () => void; myUserId: string;
}) {
  const players = useGameStore((state) => state.gameState?.players) || [];
  return <GameOverOverlay gameOver={gameOver} players={players} onPlayAgain={onPlayAgain} onQuit={onQuit} myUserId={myUserId} />;
}