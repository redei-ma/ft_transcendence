import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CharacterName } from '@transcendence/types';
import { ZeusAura } from './ZeusAura';
import { AdeAura } from './AdeAura';
import { useGameStore } from '../../storage/gameStore';

interface PlayerEntityProps {
  playerId: string;
}

export function PlayerEntity({ playerId }: PlayerEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const initialPlayer = useGameStore((state) => state.gameState?.players.find(p => p.id === playerId));
  const bodyColor = initialPlayer?.characterName === CharacterName.ZEUS ? 0x00008b : 0x8b0000;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const currentPlayer = useGameStore.getState().gameState?.players.find(p => p.id === playerId);
    if (!currentPlayer) return;

    const target = new THREE.Vector3(currentPlayer.position.x, 0, currentPlayer.position.z);
    groupRef.current.position.lerp(target, 1 - Math.pow(0.001, delta));
    groupRef.current.rotation.y = currentPlayer.rotation;
  });

  if (!initialPlayer) return null;

  const opacity = initialPlayer.isDead ? 0.2 : 1.0;

  return (
    <group ref={groupRef}>
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent={initialPlayer.isDead}
          opacity={opacity}
        />
      </mesh>

      {initialPlayer.characterName === CharacterName.ZEUS ? (
        <ZeusAura playerId={playerId} />
      ) : (
        <AdeAura playerId={playerId} />
      )}
    </group>
  );
}