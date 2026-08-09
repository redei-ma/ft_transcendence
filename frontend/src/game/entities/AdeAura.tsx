import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AttackType, GameConfig } from '@transcendence/types';
import { useGameStore } from '../../storage/gameStore';

interface AdeAuraProps {
  playerId: string;
}

// Derivati dal config
const AURA_RADIUS = GameConfig.PLAYER.RADIUS * 2;
const AURA_CENTER_Y = GameConfig.PLAYER.RADIUS * 3 * 0.5;
const CORE_RADIUS = AURA_RADIUS * 0.23;
const INNER_GLOW_RADIUS = AURA_RADIUS * 0.45;
const INNER_FIRE_RADIUS = AURA_RADIUS * 0.75;
const EMBER_COUNT_IDLE = 60;
const EMBER_COUNT_ATTACK = 120;
const EMBER_COUNT_MAX = 120;

// Vertex shader GLSL: applica Simplex Noise 3D (snoise) alla superficie della sfera per simulare le fiamme.
// uTime muove il noise verso l'alto ogni frame; uDeform controlla l'intensità del displacement.
// uRotation introduce un "lag" visivo: la sfera deformata ruota in ritardo rispetto al gruppo padre.
const fireVertexShader = `
  uniform float uTime;
  uniform float uDeform;
  uniform float uRotation;
  varying vec3 vPosition;
  varying float vNoise;
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
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
    float lagAngle = -uRotation * 0.6;
    float cosA = cos(lagAngle);
    float sinA = sin(lagAngle);
    vec3 rotatedPos = vec3(position.x * cosA - position.z * sinA, position.y, position.x * sinA + position.z * cosA);
    vec3 noiseBase = rotatedPos * 1.2 + vec3(0.0, -uTime * 1.2, 0.0);
    float n1 = snoise(noiseBase);
    float n2 = snoise(noiseBase * 2.3 + vec3(37.0, 0.0, 91.0)) * 0.5;
    float n3 = snoise(noiseBase * 4.7 + vec3(123.0, 0.0, 67.0)) * 0.25;
    float totalNoise = n1 + n2 + n3;
    vNoise = totalNoise;
    float upBias = 1.0 + max(0.0, normalize(position).y) * 0.5;
    float displacement = totalNoise * uDeform * upBias;
    vec3 newPosition = position + normalize(position) * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Fragment shader: mappa il valore di noise interpolato su una palette di colori fuoco (rosso scuro → bianco caldo).
// uHeatBias sposta la soglia del calore verso il rosso (difesa) o il bianco (attacco).
const fireFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uOpacity;
  uniform float uHeatBias;
  varying vec3 vPosition;
  varying float vNoise;
  void main() {
    float rawHeat = vNoise * 0.5 + normalize(vPosition).y * 0.15;
    float heat = clamp((rawHeat + 1.2) * (0.3 + uHeatBias), 0.0, 1.0);
    vec3 color;
    if (heat < 0.25) color = mix(vec3(0.15, 0.0, 0.0), vec3(0.4, 0.02, 0.0), heat / 0.25);
    else if (heat < 0.45) color = mix(vec3(0.4, 0.02, 0.0), vec3(0.75, 0.08, 0.0), (heat - 0.25) / 0.2);
    else if (heat < 0.65) color = mix(vec3(0.75, 0.08, 0.0), vec3(1.0, 0.35, 0.0), (heat - 0.45) / 0.2);
    else if (heat < 0.82) color = mix(vec3(1.0, 0.35, 0.0), vec3(1.0, 0.7, 0.1), (heat - 0.65) / 0.17);
    else color = mix(vec3(1.0, 0.7, 0.1), vec3(1.0, 0.9, 0.6), (heat - 0.82) / 0.18);
    color *= uIntensity;
    float flicker = 0.93 + sin(uTime * 10.0 + vPosition.x * 7.0 + vPosition.z * 5.0 + vPosition.y * 3.0) * 0.07;
    color *= flicker;
    float noiseOpacity = smoothstep(-0.3, 0.5, vNoise);
    float finalOpacity = uOpacity * (0.5 + noiseOpacity * 0.5);
    gl_FragColor = vec4(color, finalOpacity);
  }
`;

export function AdeAura({ playerId }: AdeAuraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerFireRef = useRef<THREE.ShaderMaterial>(null); // useRef su ShaderMaterial: permette di aggiornare gli uniform direttamente in useFrame senza ri-creare il materiale
  const outerFireRef = useRef<THREE.ShaderMaterial>(null);
  const currentScale = useRef(1.0); // useRef: valore interpolato — non deve mai causare re-render React
  const rotation = useRef(0);       // useRef: accumulatore angolare — aggiornato ogni frame, mai mostrato in JSX
  const time = useRef(0);           // useRef: timer cumulativo — passato come uniform uTime al GLSL
  const activeEmbers = useRef(EMBER_COUNT_IDLE); // useRef: contatore interpolato — aggiornato in useFrame, non in stato React

  // useMemo: alloca buffers Float32Array e la Points geometry una sola volta al mount.
  // Il sistema braci è completamente imperativo: nessun useState, tutti gli aggiornamenti avvengono in useFrame.
  const embersSystem = useMemo(() => { // useMemo: alloca oggetti Three.js pesanti una sola volta — ri-crearli ad ogni render causerebbe memory leak GPU
    const positions = new Float32Array(EMBER_COUNT_MAX * 3);
    const velocities = new Float32Array(EMBER_COUNT_MAX * 3);
    const lifetimes = new Float32Array(EMBER_COUNT_MAX);
    const maxLifetimes = new Float32Array(EMBER_COUNT_MAX);
    for (let i = 0; i < EMBER_COUNT_MAX; i++) {
      positions[i*3] = 0; positions[i*3+1] = -1000; positions[i*3+2] = 0;
      lifetimes[i] = 0; maxLifetimes[i] = 0;
    }
    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);
    const material = new THREE.PointsMaterial({
      size: 0.08, color: new THREE.Color(6, 1.5, 0),
      transparent: true, opacity: 0.7, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return { points, positions, velocities, lifetimes, maxLifetimes, geometry };
  }, []);

  useEffect(() => {
    return () => {
      embersSystem.geometry.dispose();
      (embersSystem.points.material as THREE.PointsMaterial).dispose();
    };
  }, [embersSystem]);

  // useMemo: gli oggetti uniform vengono creati una sola volta e mutati imperativam. in useFrame tramite .value.
  // React non deve mai ri-creare questi oggetti; farlo invaliderebbe il link GPU del materiale.
  const innerUniforms = useMemo(() => ({ // useMemo con deps=[]: oggetti stabili — aggiornati mutando .value, mai ricreati
    uTime: { value: 0 }, uIntensity: { value: 2.0 }, uDeform: { value: 0.3 },
    uOpacity: { value: 0.35 }, uRotation: { value: 0 }, uHeatBias: { value: 0.05 },
  }), []);

  const outerUniforms = useMemo(() => ({
    uTime: { value: 0 }, uIntensity: { value: 1.2 }, uDeform: { value: 0.4 },
    uOpacity: { value: 0.15 }, uRotation: { value: 0 }, uHeatBias: { value: 0.05 },
  }), []);

  // useFrame: aggiorna ogni frame scala, rotazione e uniform degli shader direttamente sulle ref.
  // getState() legge lo snapshot Zustand senza triggerare re-render React.
  // Le braci vengono aggiornate con un loop imperativo che muta posAttr.array[] e segna needsUpdate=true.
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const player = useGameStore.getState().gameState?.players.find(p => p.id === playerId);
    if (!player || player.isDead) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const dt = Math.min(delta, 0.05);
    time.current += dt;
    const isMelee = player.isAttacking && player.attackType === AttackType.MELEE_ATTACK;
    const isDefending = player.isDefending;

    let targetScale = 1.0;
    if (isDefending) targetScale = 0.85;
    else if (isMelee) targetScale = 1.15;
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, 1 - Math.pow(0.001, dt));
    groupRef.current.scale.setScalar(currentScale.current);

    const rotSpeed = isDefending ? 0.4 : isMelee ? 3.5 : 1.0;
    rotation.current += rotSpeed * dt;
    groupRef.current.rotation.y = rotation.current;

    const targetEmbers = isDefending ? 30 : isMelee ? EMBER_COUNT_ATTACK : EMBER_COUNT_IDLE;
    activeEmbers.current = Math.round(THREE.MathUtils.lerp(activeEmbers.current, targetEmbers, 1 - Math.pow(0.01, dt)));

    const timeSpeed = isDefending ? 0.4 : isMelee ? 1.3 : 0.9;
    const innerDeform = isDefending ? 0.12 : isMelee ? 0.4 : 0.3;
    const outerDeform = isDefending ? 0.2 : isMelee ? 0.55 : 0.4;
    const innerIntensity = isDefending ? 1.8 : isMelee ? 2.3 : 2.0;
    const outerIntensity = isDefending ? 1.0 : isMelee ? 1.5 : 1.2;
    const heatBias = isDefending ? -0.02 : isMelee ? 0.1 : 0.05;

    if (innerFireRef.current) {
      innerFireRef.current.uniforms.uTime.value = time.current * timeSpeed; // mutazione diretta dell'uniform: Three.js la carica alla GPU nel prossimo drawcall
      innerFireRef.current.uniforms.uDeform.value = innerDeform;
      innerFireRef.current.uniforms.uIntensity.value = innerIntensity;
      innerFireRef.current.uniforms.uRotation.value = rotation.current;
      innerFireRef.current.uniforms.uHeatBias.value = heatBias;
    }
    if (outerFireRef.current) {
      outerFireRef.current.uniforms.uTime.value = time.current * timeSpeed * 0.7;
      outerFireRef.current.uniforms.uDeform.value = outerDeform;
      outerFireRef.current.uniforms.uIntensity.value = outerIntensity;
      outerFireRef.current.uniforms.uRotation.value = rotation.current;
      outerFireRef.current.uniforms.uHeatBias.value = heatBias;
    }

    const { positions, velocities, lifetimes, maxLifetimes, geometry } = embersSystem;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const emberRate = isDefending ? 0.3 : isMelee ? 1.8 : 1.0;
    const count = activeEmbers.current;

    for (let i = 0; i < EMBER_COUNT_MAX; i++) {
      if (i >= count) {
        positions[i*3] = 0; positions[i*3+1] = -1000; positions[i*3+2] = 0;
        posAttr.array[i*3] = 0; posAttr.array[i*3+1] = -1000; posAttr.array[i*3+2] = 0;
        continue;
      }
      lifetimes[i] -= dt * emberRate;
      if (lifetimes[i] <= 0) respawnEmber(positions, velocities, lifetimes, maxLifetimes, i);
      positions[i*3]   += velocities[i*3] * dt;
      positions[i*3+1] += velocities[i*3+1] * dt;
      positions[i*3+2] += velocities[i*3+2] * dt;
      const x = positions[i*3], z = positions[i*3+2];
      positions[i*3]   += (-z * 0.5) * dt;
      positions[i*3+2] += (x * 0.5) * dt;
      posAttr.array[i*3]   = positions[i*3];
      posAttr.array[i*3+1] = positions[i*3+1];
      posAttr.array[i*3+2] = positions[i*3+2];
    }
    posAttr.needsUpdate = true;
  });

return (
    <group ref={groupRef} position={[0, AURA_CENTER_Y, 0]}>
      <mesh>
        <sphereGeometry args={[INNER_FIRE_RADIUS, 64, 64]} />
        <shaderMaterial ref={innerFireRef} vertexShader={fireVertexShader} fragmentShader={fireFragmentShader} uniforms={innerUniforms} transparent side={THREE.FrontSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[AURA_RADIUS, 48, 48]} />
        <shaderMaterial ref={outerFireRef} vertexShader={fireVertexShader} fragmentShader={fireFragmentShader} uniforms={outerUniforms} transparent side={THREE.FrontSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <primitive object={embersSystem.points} />
    </group>
  );
}

function respawnEmber(pos: Float32Array, vel: Float32Array, life: Float32Array, maxLife: Float32Array, i: number) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const r = AURA_RADIUS * (0.8 + Math.random() * 0.4);
  pos[i*3] = r*Math.sin(phi)*Math.cos(theta);
  pos[i*3+1] = r*Math.cos(phi);
  pos[i*3+2] = r*Math.sin(phi)*Math.sin(theta);
  vel[i*3] = (Math.random()-0.5)*2.0;
  vel[i*3+1] = 1.5+Math.random()*2.5;
  vel[i*3+2] = (Math.random()-0.5)*2.0;
  const l = 0.3+Math.random()*0.6;
  life[i] = l; maxLife[i] = l;
}