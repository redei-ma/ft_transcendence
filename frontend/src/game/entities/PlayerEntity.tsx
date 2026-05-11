import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei'; 
import * as THREE from 'three';
import { useGameStore } from '../../storage/gameStore';
import { PlayerModel } from './PlayerModel';
import HPBar from '../UI/components/HPBar'; 
import { CharacterName } from '@transcendence/types'; // ⚡ Serve per controllare il nome

// ⚡ RE-IMPORTIAMO LE TUE AURE
import { ZeusAura } from './ZeusAura';
import { AdeAura } from './AdeAura';

interface PlayerEntityProps {
  playerId: string;
}

export function PlayerEntity({ playerId }: PlayerEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const initialPlayer = useGameStore(state => state.gameState?.players.find(p => p.id === playerId));
  const reactivePlayer = useGameStore(state => state.gameState?.players.find(p => p.id === playerId));

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const currentPlayer = useGameStore.getState().gameState?.players.find(p => p.id === playerId);
    if (!currentPlayer) return;

    const targetPos = new THREE.Vector3(currentPlayer.position.x, 0, currentPlayer.position.z);
    groupRef.current.position.lerp(targetPos, 1 - Math.pow(0.001, delta));

    if (currentPlayer.rotation !== undefined) {
      groupRef.current.rotation.y = -currentPlayer.rotation;
    }
  });

  if (!initialPlayer || !reactivePlayer) return null;

  // Lettura delle variabili (Forzata per bypassare TS)
  const currentHP = (reactivePlayer as any).health ?? (reactivePlayer as any).hp ?? 100;
  const maxHP = (reactivePlayer as any).maxHealth ?? (reactivePlayer as any).maxHp ?? 100;
  const isDisconnected = (reactivePlayer as any).isDisconnected;

  return (
    <group ref={groupRef}>
      
      {/* 1. LA HP BAR FLUTTUANTE */}
      <Html 
        position={[0, 20, 0]} 
        center 
        zIndexRange={[100, 0]} 
      >
        <div style={{ transform: 'scale(0.8)' }}>
          <HPBar 
            characterName={initialPlayer.characterName}
            currentHP={currentHP}
            maxHP={maxHP}
            isDisconnected={isDisconnected}
            isFloating={true} 
          />
        </div>
      </Html>

      {/* 2. IL MODELLO ANIMATO */}
      <PlayerModel 
        characterName={initialPlayer.characterName} 
        playerId={playerId} 
      />

      {/* 3. ⚡ LE AURE RIPRISTINATE */}
      {initialPlayer.characterName === CharacterName.ZEUS ? (
        <ZeusAura playerId={playerId} />
      ) : (
        <AdeAura playerId={playerId} />
      )}

    </group>
  );
}