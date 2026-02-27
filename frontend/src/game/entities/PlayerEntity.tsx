
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerSnapshot, AttackType } from '../../types/game.types';
import { ZeusAura } from './ZeusAura';
import { AdeAura } from './AdeAura';

interface PlayerEntityProps {
  snapshot: PlayerSnapshot;
}

export function PlayerEntity({ snapshot }: PlayerEntityProps) {
  const groupRef = useRef<THREE.Group>(null);

  const bodyColor = snapshot.teamId === 0 ? 0x00008b : 0x8b0000;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const target = new THREE.Vector3(snapshot.position.x, 0, snapshot.position.z);
    groupRef.current.position.lerp(target, 1 - Math.pow(0.001, delta));
  });

  const opacity = snapshot.isDead ? 0.2 : 1.0;

  return (
    <group ref={groupRef}>
      {/* Body — raggio 2.4 (backend radius 1.6 × 1.5 visual) */}
      <mesh position={[0, 2.4, 0]} rotation={[0, snapshot.rotation, 0]}>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent={snapshot.isDead}
          opacity={opacity}
        />
      </mesh>

      {/* Aura specifica per personaggio */}
      {snapshot.characterName === 'zeus' ? (
        <ZeusAura
          isAttacking={snapshot.isAttacking}
          attackType={snapshot.attackType}
          isDefending={snapshot.isDefending}
          isDead={snapshot.isDead}
        />
      ) : (
        <AdeAura
          isAttacking={snapshot.isAttacking}
          attackType={snapshot.attackType}
          isDefending={snapshot.isDefending}
          isDead={snapshot.isDead}
        />
      )}
    </group>
  );
}
