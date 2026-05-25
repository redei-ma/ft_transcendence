import { Canvas } from '@react-three/fiber';
import { useGameSocket } from '../hooks/useGameSocket';
import { InputManager } from './input/inputManager';
import { useEffect, useRef, useMemo, useState } from 'react';
import { CharacterName, MatchMode, GameConfig } from '@transcendence/types';
import GameUI from './UI/gameUI';
import { PlayerEntity } from './entities/PlayerEntity';
import { BulletEntity } from './entities/BulletEntity';
import { GameOverOverlay } from './UI/components/GameOverOverlay';
import GameChat from './UI/components/GameChat';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import mapTexture from '../assets/images/mapTexture1.png';
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

type EditorTool = 'pillar' | 'wall';

export default function Game({ selectedCharacter, selectedMode, onPlayAgain, onQuit, myUserId }: GameProps) {
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

  // ==========================================
  // 🛠️ EDITOR STATE & LOGIC
  // ==========================================
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorTool>('pillar');
  
  const [customPillars, setCustomPillars] = useState<{id: string, x: number, z: number, radius: number}[]>([]);
  const [customWalls, setCustomWalls] = useState<{id: string, x: number, z: number, width: number, depth: number}[]>([]);
  
  // Stati per il disegno dei muri (2 click)
  const [wallStart, setWallStart] = useState<{x: number, z: number} | null>(null);
  const [cursorPos, setCursorPos] = useState<{x: number, z: number} | null>(null);

  const handleExportJSON = () => {
    const exportedMap = {
      ...world?.map,
      walls: [
        ...(world?.map?.walls || []),
        ...customWalls
      ],
      pillars: [
        ...(world?.map?.pillars || []),
        ...customPillars
      ]
    };
    
    const jsonString = JSON.stringify(exportedMap, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      alert("JSON copiato negli appunti! Incollalo nel tuo server.");
      console.log("Mappa esportata:", jsonString);
    }).catch(err => {
      console.error("Errore copia:", err);
      alert("Errore durante la copia negli appunti.");
    });
  };

  const handleUndo = () => {
    if (activeTool === 'pillar') {
      setCustomPillars(prev => prev.slice(0, -1));
    } else {
      setCustomWalls(prev => prev.slice(0, -1));
      setWallStart(null); // Annulla anche se stavi disegnando a metà
    }
  };

  const handleClear = () => {
    if (window.confirm("Sicuro di voler cancellare TUTTE le modifiche custom?")) {
      setCustomPillars([]);
      setCustomWalls([]);
      setWallStart(null);
    }
  };
  // ==========================================

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
      
      {/* 🛠️ PANNELLO EDITOR */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.85)', padding: '15px', borderRadius: '8px', color: 'white', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', width: '220px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', textAlign: 'center' }}>Map Editor</h3>
        <button 
          onClick={() => { setIsEditMode(!isEditMode); setWallStart(null); }} 
          style={{ padding: '8px', background: isEditMode ? '#dc3545' : '#198754', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isEditMode ? "Chiudi Editor" : "Attiva Editor"}
        </button>
        
        {isEditMode && (
          <>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => { setActiveTool('pillar'); setWallStart(null); }}
                style={{ flex: 1, padding: '6px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: activeTool === 'pillar' ? '#0d6efd' : '#444', color: 'white' }}
              >
                Pillars
              </button>
              <button 
                onClick={() => setActiveTool('wall')}
                style={{ flex: 1, padding: '6px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: activeTool === 'wall' ? '#0d6efd' : '#444', color: 'white' }}
              >
                Walls
              </button>
            </div>

            <div style={{ fontSize: '12px', borderBottom: '1px solid #555', paddingBottom: '10px', marginTop: '5px' }}>
              {activeTool === 'pillar' ? (
                "Clicca sulla mappa per piazzare."
              ) : (
                wallStart ? "Clicca di nuovo per finire il muro." : "Clicca per iniziare un muro."
              )}
              <br/><br/>
              <b>Pillars: {customPillars.length} | Walls: {customWalls.length}</b>
            </div>
            
            <button onClick={handleUndo} style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#6c757d', color: 'white' }}>
              Annulla Ultimo
            </button>
            <button onClick={handleClear} style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#6c757d', color: 'white' }}>
              Pulisci Tutto
            </button>
            <button onClick={handleExportJSON} style={{ padding: '10px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>
              Esporta JSON
            </button>
          </>
        )}
      </div>

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

        {/* 🛠️ PIANO DI CLICK (Raycasting) PER L'EDITOR */}
        {isEditMode && (
          <mesh 
            position={[centerX, 0, centerZ]} 
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={(e) => {
              if (activeTool === 'wall' && wallStart) {
                setCursorPos({ x: Math.round(e.point.x), z: Math.round(e.point.z) });
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              const x = Math.round(e.point.x);
              const z = Math.round(e.point.z);

              if (activeTool === 'pillar') {
                setCustomPillars(prev => [...prev, { id: `custom_pil_${prev.length + 1}`, x, z, radius: 4 }]);
              } 
              else if (activeTool === 'wall') {
                if (!wallStart) {
                  // Primo click: fissa il punto di partenza
                  setWallStart({ x, z });
                  setCursorPos({ x, z });
                } else {
                  // Secondo click: crea il muro
                  const x1 = wallStart.x;
                  const z1 = wallStart.z;
                  
                  // Calcola dimensioni
                  let w = Math.abs(x - x1);
                  let d = Math.abs(z - z1);
                  
                  // Evita muri con spessore 0 (li forza a 5 per fare i muri dritti perfetti)
                  if (w === 0) w = 5;
                  if (d === 0) d = 5;

                  // L'angolo in alto a sinistra (Top-Left) è il minimo tra i due punti
                  const finalX = Math.min(x1, x);
                  const finalZ = Math.min(z1, z);

                  setCustomWalls(prev => [...prev, { id: `custom_wal_${prev.length + 1}`, x: finalX, z: finalZ, width: w, depth: d }]);
                  setWallStart(null); // Reset per il prossimo muro
                  setCursorPos(null);
                }
              }
            }}
          >
            <planeGeometry args={[mapWidth, mapDepth]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.1} />
          </mesh>
        )}

        {/* 🛠️ ANTEPRIMA DEL MURO IN FASE DI DISEGNO */}
        {isEditMode && activeTool === 'wall' && wallStart && cursorPos && (
          <mesh 
            position={[
              Math.min(wallStart.x, cursorPos.x) + Math.max(Math.abs(cursorPos.x - wallStart.x), 5)/2, 
              2.5, 
              Math.min(wallStart.z, cursorPos.z) + Math.max(Math.abs(cursorPos.z - wallStart.z), 5)/2
            ]}
          >
            <boxGeometry args={[Math.max(Math.abs(cursorPos.x - wallStart.x), 5), 5, Math.max(Math.abs(cursorPos.z - wallStart.z), 5)]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.5} wireframe />
          </mesh>
        )}

        {/* Giocatori */}
        {playerIds.map((id) => (
          <PlayerEntity key={id} playerId={id} />
        ))}

        {/* Muri Originali + Custom */}
        {[...(world?.map?.walls || []), ...customWalls].map((w: any, i: number) => {
          const wx = w.position?.x ?? w.x ?? 0;
          const wz = w.position?.z ?? w.z ?? 0;
          const isCustom = w.id?.startsWith('custom_');
          return (
            <mesh key={`wall-${i}`} position={[wx + w.width/2, 2.5, wz + w.depth/2]}>
              <boxGeometry args={[w.width, 5, w.depth]} />
              <meshStandardMaterial 
                color={isCustom ? "#00ffff" : "#1a1a2e"} 
                emissive={isCustom ? "#005555" : "#000000"}
                transparent opacity={isCustom ? 0.8 : 0.6} 
              />
            </mesh>
          );
        })}

        {/* Pilastri Originali + Custom */}
        {[...(world?.map?.pillars || []), ...customPillars].map((p: any, i: number) => {
          const px = p.position?.x ?? p.x ?? 0;
          const pz = p.position?.z ?? p.z ?? 0;
          const isCustom = p.id?.startsWith('custom_');
          return (
            <mesh key={`pillar-${i}`} position={[px, 2.5, pz]}>
              <cylinderGeometry args={[p.radius, p.radius, 5, 16]} />
              <meshStandardMaterial 
                color={isCustom ? "#00ff00" : "#1a1a2e"} 
                emissive={isCustom ? "#00ff00" : "#d4af37"} 
                emissiveIntensity={isCustom ? 0.6 : 0.1}
                transparent opacity={isCustom ? 0.9 : 0.7} 
              />
            </mesh>
          );
        })}
        
        {/* Proiettili */}
        {bulletIds.map((id) => (
          <BulletEntity key={id} bulletId={id} />
        ))}

        <EffectComposer>
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>

      {!gameOver && !isEditMode && (
        <GameUI
          character={selectedCharacter}
          isConnected={isConnected}
          mapData={world}
          maxPlayers={world?.map?.maxPlayers || 2}
          gameOver={gameOver}
        />
      )}

      {!gameOver && !isEditMode && (selectedMode === MatchMode.RANKED || selectedMode === MatchMode.UNRANKED) && (
        <GameChat myUserId={myUserId} isVisible={true} />
      )}

      {gameOver && !isEditMode && (
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