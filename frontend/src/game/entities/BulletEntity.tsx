import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BulletSnapshot, BulletHit } from '../../types/game.types';
import { ImpactEffect } from './ImpactEffect';

interface BulletEntityProps {
  snapshot: BulletSnapshot;
}

// Scaled 2x (was 0.5)
const BULLET_RADIUS = 1.0;

// --- Fire shader ---

const bulletFireVertex = `
  uniform float uTime;
  uniform float uDeform;
  varying vec3 vPosition;
  varying float vNoise;
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  void main() {
    vPosition = position;
    vec3 noiseBase = position * 3.0 + vec3(0.0, -uTime * 2.0, 0.0);
    float n1 = snoise(noiseBase);
    float n2 = snoise(noiseBase * 2.5 + vec3(37.0, 0.0, 91.0)) * 0.4;
    vNoise = n1 + n2;
    vec3 newPosition = position + normalize(position) * vNoise * uDeform;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const bulletFireFragment = `
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vPosition;
  varying float vNoise;
  void main() {
    float heat = clamp((vNoise + 1.0) * 0.35, 0.0, 1.0);
    vec3 color;
    if (heat < 0.3) {
      color = mix(vec3(0.2, 0.0, 0.0), vec3(0.5, 0.03, 0.0), heat / 0.3);
    } else if (heat < 0.55) {
      color = mix(vec3(0.5, 0.03, 0.0), vec3(1.0, 0.35, 0.0), (heat - 0.3) / 0.25);
    } else if (heat < 0.8) {
      color = mix(vec3(1.0, 0.35, 0.0), vec3(1.0, 0.7, 0.1), (heat - 0.55) / 0.25);
    } else {
      color = mix(vec3(1.0, 0.7, 0.1), vec3(1.0, 0.9, 0.6), (heat - 0.8) / 0.2);
    }
    color *= uIntensity;
    float flicker = 0.92 + sin(uTime * 14.0 + vPosition.x * 10.0 + vPosition.z * 8.0) * 0.08;
    color *= flicker;
    float noiseOpacity = smoothstep(-0.4, 0.3, vNoise);
    gl_FragColor = vec4(color, 0.7 + noiseOpacity * 0.3);
  }
`;

// --- Helpers per creare line objects ---

function createBoltGeo(segments: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments * 3), 3));
  return geo;
}

function createLinePrimitive(geo: THREE.BufferGeometry, color: THREE.Color, opacity: number): THREE.Line {
  return new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

// --- Entry ---

export function BulletEntity({ snapshot }: BulletEntityProps) {
  const hasHit = snapshot.hit !== undefined && snapshot.hit !== BulletHit.NONE;

  if (hasHit) {
    return <ImpactEffect snapshot={snapshot} />;
  }

  return snapshot.characterName === 'zeus'
    ? <ZeusBullet snapshot={snapshot} />
    : <AdeBullet snapshot={snapshot} />;
}

// ============================================
// ZEUS BULLET
// ============================================

function ZeusBullet({ snapshot }: { snapshot: BulletSnapshot }) {
  const groupRef = useRef<THREE.Group>(null);
  const timeAccum = useRef(0);
  const prevPos = useRef(new THREE.Vector3(snapshot.position.x, 1, snapshot.position.z));

  const boltCount = 6;
  const boltSegments = 6;
  const trailBoltCount = 4;
  const trailSegments = 5;

  const boltObjects = useMemo(() => {
    const objs: THREE.Line[] = [];
    for (let i = 0; i < boltCount; i++) {
      objs.push(createLinePrimitive(
        createBoltGeo(boltSegments),
        new THREE.Color(3, 5, 10),
        0.85
      ));
    }
    return objs;
  }, []);

  const trailObjects = useMemo(() => {
    const objs: THREE.Line[] = [];
    for (let i = 0; i < trailBoltCount; i++) {
      objs.push(createLinePrimitive(
        createBoltGeo(trailSegments),
        new THREE.Color(1, 2, 5),
        0.5
      ));
    }
    return objs;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    const target = new THREE.Vector3(snapshot.position.x, 1, snapshot.position.z);
    groupRef.current.position.lerp(target, 1 - Math.pow(0.001, dt));

    const currentPos = groupRef.current.position;
    const moveDir = new THREE.Vector3().subVectors(prevPos.current, currentPos);

    timeAccum.current += dt;
    if (timeAccum.current > 0.025) {
      timeAccum.current = 0;

      for (const line of boltObjects) {
        const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        const radius = BULLET_RADIUS * 1.5;

        const sTheta = Math.random() * Math.PI * 2;
        const sPhi = Math.acos(2 * Math.random() - 1);
        const eTheta = sTheta + (Math.random() - 0.5) * Math.PI;
        const ePhi = sPhi + (Math.random() - 0.5) * Math.PI * 0.5;

        for (let j = 0; j < boltSegments; j++) {
          const t = j / (boltSegments - 1);
          const theta = sTheta + (eTheta - sTheta) * t;
          const phi = sPhi + (ePhi - sPhi) * t;
          const r = radius * (0.6 + Math.random() * 0.4);
          const jit = Math.sin(t * Math.PI) * 0.12;

          posAttr.array[j * 3]     = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * jit;
          posAttr.array[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * jit;
          posAttr.array[j * 3 + 2] = r * Math.cos(phi) + (Math.random() - 0.5) * jit;
        }
        posAttr.needsUpdate = true;
      }

      for (const line of trailObjects) {
        const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;

        for (let j = 0; j < trailSegments; j++) {
          const t = j / (trailSegments - 1);
          posAttr.array[j * 3]     = moveDir.x * t * 2.5 + (Math.random() - 0.5) * 0.2;
          posAttr.array[j * 3 + 1] = moveDir.y * t * 2.5 + (Math.random() - 0.5) * 0.2;
          posAttr.array[j * 3 + 2] = moveDir.z * t * 2.5 + (Math.random() - 0.5) * 0.2;
        }
        posAttr.needsUpdate = true;
      }
    }

    prevPos.current.copy(currentPos);
  });

  return (
    <group ref={groupRef} position={[snapshot.position.x, 1, snapshot.position.z]}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[BULLET_RADIUS * 0.35, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(8, 10, 15)}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Alone */}
      <mesh>
        <sphereGeometry args={[BULLET_RADIUS * 0.6, 12, 12]} />
        <meshBasicMaterial
          color={new THREE.Color(0, 2, 5)}
          transparent
          opacity={0.2}
          toneMapped={false}
        />
      </mesh>

      {boltObjects.map((line, i) => (
        <primitive key={`bolt-${i}`} object={line} />
      ))}

      {trailObjects.map((line, i) => (
        <primitive key={`trail-${i}`} object={line} />
      ))}
    </group>
  );
}

// ============================================
// ADE BULLET
// ============================================

const TRAIL_COUNT = 50;

function AdeBullet({ snapshot }: { snapshot: BulletSnapshot }) {
  const groupRef = useRef<THREE.Group>(null);
  const fireMatRef = useRef<THREE.ShaderMaterial>(null);
  const time = useRef(0);
  const spawnTimer = useRef(0);
  const nextIdx = useRef(0);
  const historyLen = 20;
  const posHistory = useRef<THREE.Vector3[]>([]);

  const fireUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 2.5 },
    uDeform: { value: 0.15 },
  }), []);

  // Sistema scia completamente imperativo
  const trailSystem = useMemo(() => {
    const pos = new Float32Array(TRAIL_COUNT * 3);
    const vel = new Float32Array(TRAIL_COUNT * 3);
    const life = new Float32Array(TRAIL_COUNT);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      pos[i * 3]     = 0;
      pos[i * 3 + 1] = -1000;
      pos[i * 3 + 2] = 0;
      life[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      color: new THREE.Color(6, 1.5, 0),
      transparent: true,
      opacity: 0.6,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    return { points, pos, vel, life, geometry };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      trailSystem.geometry.dispose();
      (trailSystem.points.material as THREE.PointsMaterial).dispose();
    };
  }, [trailSystem]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    time.current += dt;

    const target = new THREE.Vector3(snapshot.position.x, 1, snapshot.position.z);
    groupRef.current.position.lerp(target, 1 - Math.pow(0.001, dt));

    if (fireMatRef.current) {
      fireMatRef.current.uniforms.uTime.value = time.current * 2.0;
    }

    const worldPos = groupRef.current.position.clone();
    posHistory.current.push(worldPos);
    if (posHistory.current.length > historyLen) {
      posHistory.current.shift();
    }

    // Scia — aggiorna sistema imperativo
    const { pos, vel, life, geometry } = trailSystem;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;

    spawnTimer.current += dt;
    while (spawnTimer.current > 0.02) {
      spawnTimer.current -= 0.02;
      const idx = nextIdx.current % TRAIL_COUNT;
      nextIdx.current++;

      const history = posHistory.current;
      const histIdx = Math.max(0, history.length - 3 - Math.floor(Math.random() * 3));
      const spawnWorldPos = history[histIdx] || worldPos;

      const localPos = groupRef.current.worldToLocal(spawnWorldPos.clone());

      pos[idx * 3]     = localPos.x + (Math.random() - 0.5) * 0.6;
      pos[idx * 3 + 1] = localPos.y + (Math.random() - 0.5) * 0.6;
      pos[idx * 3 + 2] = localPos.z + (Math.random() - 0.5) * 0.6;

      vel[idx * 3]     = (Math.random() - 0.5) * 1.0;
      vel[idx * 3 + 1] = 0.5 + Math.random() * 1.0;
      vel[idx * 3 + 2] = (Math.random() - 0.5) * 1.0;

      life[idx] = 0.3 + Math.random() * 0.3;
    }

    for (let i = 0; i < TRAIL_COUNT; i++) {
      life[i] -= dt;

      if (life[i] <= 0) {
        pos[i * 3]     = 0;
        pos[i * 3 + 1] = -1000;
        pos[i * 3 + 2] = 0;
        posAttr.array[i * 3]     = 0;
        posAttr.array[i * 3 + 1] = -1000;
        posAttr.array[i * 3 + 2] = 0;
        continue;
      }

      pos[i * 3]     += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

      const groupDelta = new THREE.Vector3().subVectors(worldPos, (posHistory.current[posHistory.current.length - 2] || worldPos));
      pos[i * 3]     -= groupDelta.x;
      pos[i * 3 + 1] -= groupDelta.y;
      pos[i * 3 + 2] -= groupDelta.z;

      posAttr.array[i * 3]     = pos[i * 3];
      posAttr.array[i * 3 + 1] = pos[i * 3 + 1];
      posAttr.array[i * 3 + 2] = pos[i * 3 + 2];
    }

    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[snapshot.position.x, 1, snapshot.position.z]}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[BULLET_RADIUS * 0.25, 10, 10]} />
        <meshBasicMaterial
          color={new THREE.Color(12, 4, 0)}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Sfera fuoco */}
      <mesh>
        <sphereGeometry args={[BULLET_RADIUS, 32, 32]} />
        <shaderMaterial
          ref={fireMatRef}
          vertexShader={bulletFireVertex}
          fragmentShader={bulletFireFragment}
          uniforms={fireUniforms}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Alone */}
      <mesh>
        <sphereGeometry args={[BULLET_RADIUS * 1.4, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(3, 0.4, 0)}
          transparent
          opacity={0.08}
          toneMapped={false}
        />
      </mesh>

      {/* Scia — imperativa */}
      <primitive object={trailSystem.points} />
    </group>
  );
}
