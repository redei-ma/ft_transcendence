import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei'; 
import * as THREE from 'three';
import { useGameStore } from '../../storage/gameStore';
import { PlayerModel } from './PlayerModel';
import HPBar from '../UI/components/HPBar'; 
import { CharacterName, GameConfig } from '@transcendence/types'; // ⚡ Serve per controllare il nome

// ⚡ RE-IMPORTIAMO LE TUE AURE
import { ZeusAura } from './ZeusAura';
import { AdeAura } from './AdeAura';

interface PlayerEntityProps {
  playerId: string;
}

export function PlayerEntity({ playerId }: PlayerEntityProps) {
  const groupRef = useRef<THREE.Group>(null); // useRef: riferimento mutabile all'oggetto Three.js Group; modificarlo non causa re-render

  // initialPlayer: selettore reattivo — ri-renderizza il componente quando la lista player cambia (aggiunta/rimozione)
  const initialPlayer = useGameStore(state => state.gameState?.players.find(p => p.id === playerId)); // useGameStore(selector): si abbona — re-render se il valore ritornato cambia
  // reactivePlayer: selettore reattivo — ri-renderizza quando cambiano HP, isDead, ecc. (valori mostrati in DOM)
  const reactivePlayer = useGameStore(state => state.gameState?.players.find(p => p.id === playerId));

  // useFrame: loop R3F eseguito ogni frame (~60fps).
  // Usa getState() direttamente per leggere lo snapshot senza triggerare re-render React.
  // Interpola la posizione con lerp frame-rate-independent: 1 - 0.001^delta compensa qualsiasi deltaTime.
  useFrame((_, delta) => { // useFrame: sostituisce requestAnimationFrame in R3F; viene chiamato dentro il render loop di Three.js
    if (!groupRef.current) return;

    const currentPlayer = useGameStore.getState().gameState?.players.find(p => p.id === playerId); // getState(): lettura istantanea senza abbonamento — non causa re-render
    if (!currentPlayer) return;

    const targetPos = new THREE.Vector3(currentPlayer.position.x, 0, currentPlayer.position.z);
    groupRef.current.position.lerp(targetPos, 1 - Math.pow(0.001, delta)); // lerp frame-rate-independent: alpha = 1 - 0.001^delta; a 60fps ≈ 0.064 per frame

    if (currentPlayer.rotation !== undefined) {
      groupRef.current.rotation.y = -currentPlayer.rotation;
    }
  });

  if (!initialPlayer || !reactivePlayer) return null;

  const currentHP = reactivePlayer.hp ?? 100;
  const maxHP = GameConfig.PLAYER.DEFAULT_HP;
  const isDisconnected = reactivePlayer.isDisconnected;
  const disconnectionTimer = reactivePlayer.disconnectionTimer ?? 0;

  return (
    <group ref={groupRef}>

      {/* 1. LA HP BAR FLUTTUANTE
          Html di @react-three/drei: inietta un elemento DOM dentro il Canvas, ancorato in coordinate 3D.
          Questa è la tecnica che permette la HP bar "flottante" sopra il personaggio rimanendo nel Canvas WebGL. */}
      <Html
        position={[0, 20, 0]}
        center
        zIndexRange={[100, 0]}
      >
        <div style={{ transform: 'scale(0.8)' }}>
          <HPBar 
            characterName={initialPlayer.characterName}
            displayName={initialPlayer.userName}
            currentHP={currentHP}
            maxHP={maxHP}
            isDisconnected={isDisconnected}
            disconnectionTimer={disconnectionTimer}
            isFloating={true}
          />
        </div>
      </Html>
      {/* 2. IL TIMER DI RESPAWN */}
      {reactivePlayer.isDead && (
        <Html position={[0, 12, 0]} center zIndexRange={[100, 0]}>
          <div style={{
            pointerEvents: 'none',
            textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap',
          }}>
            <div style={{
              color: '#e84057', fontSize: '16px', fontWeight: 'bold',
              textShadow: '2px 2px 6px rgba(0,0,0,1)',
              animation: 'pulse 1s infinite',
            }}>
              DEAD
            </div>
            <div style={{
              color: '#e0a32e', fontSize: '12px', fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,1)',
            }}>
              Respawn in: {Math.ceil(GameConfig.PLAYER.RESPAWN_TIMER - reactivePlayer.respawnTimer)}s
            </div>
          </div>
        </Html>
      )}

      {/* 3. IL MODELLO ANIMATO */}
      <PlayerModel 
        characterName={initialPlayer.characterName} 
        playerId={playerId} 
      />

      {/* 4.  LE AURE  */}
      {initialPlayer.characterName === CharacterName.ZEUS ? (
        <ZeusAura playerId={playerId} />
      ) : (
        <AdeAura playerId={playerId} />
      )}

    </group>
  );
}