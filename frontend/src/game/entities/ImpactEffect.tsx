import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {BulletSnapshot} from '@transcendence/types';
import {CharacterName} from '@transcendence/types';

interface ImpactEffectProps {
  snapshot: BulletSnapshot;
}

const PARTICLE_COUNT = 40;
const BOLT_COUNT_ZEUS = 6;
const BOLT_SEGMENTS = 5;
const DURATION = 0.5;

function createImpactBolt(segments: number, color: THREE.Color): THREE.Line {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments * 3), 3));
  return new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

export function ImpactEffect({ snapshot }: ImpactEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const [expired, setExpired] = useState(false);
  const age = useRef(0);

  const isZeus = snapshot.characterName === CharacterName.ZEUS;

  const particleColor = isZeus
    ? new THREE.Color(0, 4, 10)
    : new THREE.Color(8, 2, 0);

  const flashColor = isZeus
    ? new THREE.Color(0, 8, 20)
    : new THREE.Color(15, 5, 0);

  const particleData = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      // Scaled 2x — particles fly further
      const speed = 6 + Math.random() * 10;

      vel[i * 3]     = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vel[i * 3 + 2] = Math.cos(phi) * speed;
    }

    return { positions: pos, velocities: vel };
  }, []);

  const boltObjects = useMemo(() => {
    if (!isZeus) return [];
    const objs: THREE.Line[] = [];
    for (let i = 0; i < BOLT_COUNT_ZEUS; i++) {
      objs.push(createImpactBolt(BOLT_SEGMENTS, new THREE.Color(2, 4, 8)));
    }
    return objs;
  }, [isZeus]);

  useFrame((_, delta) => {
    if (expired) return;
    const dt = Math.min(delta, 0.05);
    age.current += dt;

    if (age.current >= DURATION) {
      setExpired(true);
      return;
    }

    const progress = age.current / DURATION;

    // Flash — scaled 2x
    if (flashRef.current) {
      flashRef.current.scale.setScalar(1.0 + progress * 6);
      const mat = flashRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - progress) * 0.6;
    }

    // Particelle
    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const { positions, velocities } = particleData;
      const drag = 1 - progress * 0.8;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3]     += velocities[i * 3] * dt * drag;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt * drag;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt * drag;

        posAttr.array[i * 3]     = positions[i * 3];
        posAttr.array[i * 3 + 1] = positions[i * 3 + 1];
        posAttr.array[i * 3 + 2] = positions[i * 3 + 2];
      }
      posAttr.needsUpdate = true;

      const mat = particlesRef.current.material as THREE.PointsMaterial;
      mat.opacity = (1 - progress) * 0.9;
    }

    // Zeus: fulmini esplosivi — scaled 2x
    for (const line of boltObjects) {
      const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const radius = (1.0 + progress * 6) * 1.5;

      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.acos(2 * Math.random() - 1);
      const eTheta = sTheta + (Math.random() - 0.5) * Math.PI;
      const ePhi = sPhi + (Math.random() - 0.5) * Math.PI * 0.5;

      for (let j = 0; j < BOLT_SEGMENTS; j++) {
        const t = j / (BOLT_SEGMENTS - 1);
        const theta = sTheta + (eTheta - sTheta) * t;
        const phi = sPhi + (ePhi - sPhi) * t;
        const r = radius * (0.5 + Math.random() * 0.5);
        const jit = Math.sin(t * Math.PI) * 0.6 * (1 + progress);

        posAttr.array[j * 3]     = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * jit;
        posAttr.array[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * jit;
        posAttr.array[j * 3 + 2] = r * Math.cos(phi) + (Math.random() - 0.5) * jit;
      }
      posAttr.needsUpdate = true;

      (line.material as THREE.LineBasicMaterial).opacity = (1 - progress) * 0.8;
    }
  });

  if (expired) return null;

  return (
    <group ref={groupRef} position={[snapshot.position.x, 1, snapshot.position.z]}>
      {/* Flash — 1.0 (was 0.5) */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial
          color={flashColor}
          transparent
          opacity={0.6}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Particelle */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particleData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={isZeus ? 0.16 : 0.24}
          color={particleColor}
          transparent
          opacity={0.9}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {boltObjects.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}
