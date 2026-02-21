import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AuraConfig } from '../renderer/auraSystem';
import { AttackType } from '../../types/game.types';

interface AuraProps {
  config: AuraConfig;
  isAttacking: boolean;
  attackType: AttackType | undefined;
  isDead: boolean;
  isDefending: boolean;
}

export function Aura({ config, isAttacking, attackType, isDead, isDefending }: AuraProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const currentScale = useRef(1.0);

  const { positions, colors } = useMemo(() => {
    const { count, orbitRadius } = config.particles;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = orbitRadius * (3 + Math.random() * 0.4);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color(
        Math.random() > 0.5 ? config.colors.core : config.colors.highlight
      );
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }

    return { positions: pos, colors: col };
  }, [config]);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;

    // Defending: aura si contrae e rallenta
    // Attacking melee: aura si espande e accelera
    // Idle: normale
    let targetScale = 1.0;
    let rotSpeed = config.rotation.idle;

    if (isDefending) {
      targetScale = 0.6; // Si stringe attorno al corpo
      rotSpeed = config.rotation.idle * 0.3; // Rallenta
    } else if (isAttacking && attackType === AttackType.MELEE_ATTACK) {
      targetScale = config.sphere.attackRadius / config.sphere.baseRadius;
      rotSpeed = config.rotation.attack;
    }

    particlesRef.current.rotation.y += rotSpeed * delta;
    particlesRef.current.rotation.x += (rotSpeed * 0.5) * delta;

    currentScale.current = THREE.MathUtils.lerp(
      currentScale.current,
      targetScale,
      1 - Math.pow(0.001, delta),
    );

    particlesRef.current.scale.setScalar(currentScale.current);
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(currentScale.current);
    }
  });

  if (isDead) return null;

  return (
    <group position={[0, 0.8, 0]}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[config.sphere.baseRadius, 32, 32]} />
        <meshBasicMaterial
          color={config.colors.core}
          transparent
          opacity={isDefending ? 0.4 : 0.2}
        />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={config.particles.size}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}