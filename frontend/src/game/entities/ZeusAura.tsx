import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AURA_CONFIG } from '../../configs/auraConfig';
import { AttackType } from '../../types/game.types';

interface ZeusAuraProps {
  isAttacking: boolean;
  attackType: AttackType | undefined;
  isDefending: boolean;
  isDead: boolean;
}

export function ZeusAura({ isAttacking, attackType, isDefending, isDead }: ZeusAuraProps) {
  const config = AURA_CONFIG.zeus;
  const groupRef = useRef<THREE.Group>(null);
  const boltsRef = useRef<THREE.Group>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const timeAccum = useRef(0);
  const currentScale = useRef(1.0);

  const boltCount = 8;
  const segmentsPerBolt = 10;
  const sparkCount = 300;

  const boltLines = useMemo(() => {
    const lines: THREE.BufferGeometry[] = [];
    for (let i = 0; i < boltCount; i++) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(segmentsPerBolt * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      lines.push(geo);
    }
    return lines;
  }, []);

  const sparkData = useMemo(() => {
    const pos = new Float32Array(sparkCount * 3);
    const dir = new Float32Array(sparkCount * 3);
    const life = new Float32Array(sparkCount);
    const speed = new Float32Array(sparkCount);

    for (let i = 0; i < sparkCount; i++) {
      respawnSpark(pos, dir, life, speed, i);
    }

    return { positions: pos, directions: dir, lifetimes: life, speeds: speed };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const isMelee = isAttacking && attackType === AttackType.MELEE_ATTACK;

    let targetScale = 1.0;
    if (isDefending) {
      targetScale = 0.85;
    } else if (isMelee) {
      targetScale = 1.6;
    }
    currentScale.current = THREE.MathUtils.lerp(
      currentScale.current, targetScale, 1 - Math.pow(0.001, delta)
    );
    groupRef.current.scale.setScalar(currentScale.current);

    const speedMult = isDefending ? 0.4 : isMelee ? 3.0 : 1.0;
    const jitterMult = isDefending ? 0.3 : isMelee ? 1.5 : 1.0;
    const refreshRate = isDefending ? 0.12 : isMelee ? 0.03 : 0.05;

    // --- Fulmini ---
    timeAccum.current += delta;
    if (boltsRef.current && timeAccum.current > refreshRate) {
      timeAccum.current = 0;
      regenerateBolts(boltLines, segmentsPerBolt, jitterMult);
    }

    // --- Scintille ---
    if (sparksRef.current) {
      const posAttr = sparksRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const { positions, directions, lifetimes, speeds } = sparkData;

      for (let i = 0; i < sparkCount; i++) {
        lifetimes[i] -= delta * 1.2 * speedMult;

        if (lifetimes[i] <= 0) {
          respawnSpark(positions, directions, lifetimes, speeds, i);
        }

        positions[i * 3]     += directions[i * 3]     * speeds[i] * delta * speedMult;
        positions[i * 3 + 1] += directions[i * 3 + 1] * speeds[i] * delta * speedMult;
        positions[i * 3 + 2] += directions[i * 3 + 2] * speeds[i] * delta * speedMult;

        positions[i * 3]     += (Math.random() - 0.5) * 0.15 * jitterMult;
        positions[i * 3 + 1] += (Math.random() - 0.5) * 0.15 * jitterMult;
        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.15 * jitterMult;

        posAttr.array[i * 3]     = positions[i * 3];
        posAttr.array[i * 3 + 1] = positions[i * 3 + 1];
        posAttr.array[i * 3 + 2] = positions[i * 3 + 2];
      }

      posAttr.needsUpdate = true;
    }
  });

  if (isDead) return null;

  const coreOpacity = isDefending ? 0.5 : 0.35;
  const innerOpacity = isDefending ? 0.12 : 0.06;

  return (
    <group ref={groupRef} position={[0, 2.4, 0]}>
      {/* Core glow — 0.9 (was 0.6) */}
      <mesh>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(0, 4, 10)}
          transparent
          opacity={coreOpacity}
          toneMapped={false}
        />
      </mesh>

      {/* Inner sphere — 3.0 (was 2.0) */}
      <mesh>
        <sphereGeometry args={[3.0, 24, 24]} />
        <meshBasicMaterial
          color={new THREE.Color(0, 0.5, 1)}
          transparent
          opacity={innerOpacity}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lightning bolts */}
      <group ref={boltsRef}>
        {boltLines.map((geo, i) => {
          const line = new THREE.Line(
            geo,
            new THREE.LineBasicMaterial({
              color: new THREE.Color(0, 2, 5),
              transparent: true,
              opacity: 0.9,
              toneMapped: false,
              blending: THREE.AdditiveBlending,
            })
          );
          return <primitive key={i} object={line} />;
        })}
      </group>

      {/* Sparks */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sparkData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color={new THREE.Color(0, 4, 10)}
          transparent
          opacity={0.9}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function respawnSpark(
  pos: Float32Array, dir: Float32Array,
  life: Float32Array, speed: Float32Array, i: number,
) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  // Spawn radius — 1.8 + random 1.2 (was 1.2 + 0.8)
  const r = 1.8 + Math.random() * 1.2;

  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.sin(phi) * Math.sin(theta);
  const z = Math.cos(phi);

  pos[i * 3]     = x * r;
  pos[i * 3 + 1] = y * r;
  pos[i * 3 + 2] = z * r;

  dir[i * 3]     = x;
  dir[i * 3 + 1] = y;
  dir[i * 3 + 2] = z;

  speed[i] = 1.5 + Math.random() * 2.5;
  life[i] = 0.3 + Math.random() * 0.5;
}

function regenerateBolts(
  geometries: THREE.BufferGeometry[],
  segments: number,
  jitterMult: number,
) {
  // Bolt radius — 4.5 (was 3.0)
  const radius = 4.5;
  const jitter = 0.5 * jitterMult;

  for (const geo of geometries) {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

    const startTheta = Math.random() * Math.PI * 2;
    const startPhi = Math.acos(2 * Math.random() - 1);
    const endTheta = startTheta + (Math.random() - 0.5) * Math.PI;
    const endPhi = startPhi + (Math.random() - 0.5) * Math.PI * 0.5;

    for (let j = 0; j < segments; j++) {
      const t = j / (segments - 1);
      const theta = startTheta + (endTheta - startTheta) * t;
      const phi = startPhi + (endPhi - startPhi) * t;
      const r = radius * (0.6 + Math.random() * 0.4);
      const jitterStrength = Math.sin(t * Math.PI) * jitter;

      posAttr.array[j * 3]     = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * jitterStrength;
      posAttr.array[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * jitterStrength;
      posAttr.array[j * 3 + 2] = r * Math.cos(phi) + (Math.random() - 0.5) * jitterStrength;
    }

    posAttr.needsUpdate = true;
  }
}
