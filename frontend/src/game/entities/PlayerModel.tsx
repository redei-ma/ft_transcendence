import { useRef, useMemo } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CharacterName } from '@transcendence/types';
import { useGameStore } from '../../storage/gameStore';

const MODEL_PATHS: Record<string, string> = {
  [CharacterName.ZEUS]: '/models/Zeus.glb',
  [CharacterName.ADE]: '/models/Hades.glb',
};

const TARGET_HEIGHT = 0.20;
const MODEL_ROTATION_OFFSET = Math.PI/2;

interface PlayerModelProps {
  characterName: CharacterName;
  playerId: string;
}

export function PlayerModel({ characterName, playerId }: PlayerModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_PATHS[characterName]);
  const currentOpacity = useRef(1);

  // Calcoliamo il clone e la scala in un colpo solo, prima del render
  const { clonedScene, computedScale } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.frustumCulled = false;

        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
      }
    });

    // Calcoliamo la scala sul modello intatto
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    return { 
      clonedScene: clone, 
      computedScale: TARGET_HEIGHT / maxDim 
    };
  }, [scene]);

  useFrame(() => {
    const player = useGameStore.getState().gameState?.players.find(p => p.id === playerId);
    if (!player) return;

    const targetOpacity = player.isDead ? 0.2 : 1;
    if (currentOpacity.current === targetOpacity) return;

    currentOpacity.current = targetOpacity;
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          mat.transparent = targetOpacity < 1;
          mat.opacity = targetOpacity;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      <group ref={modelRef} rotation={[0, MODEL_ROTATION_OFFSET, 0]}>
        {/* <Center> centra automaticamente l'oggetto sugli assi X e Z.
          La prop 'bottom' allinea la base del Bounding Box a y=0 (i piedi a terra).
        */}
        <Center bottom>
          <primitive 
            object={clonedScene} 
            scale={computedScale} 
          />
        </Center>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_PATHS[CharacterName.ZEUS]);
useGLTF.preload(MODEL_PATHS[CharacterName.ADE]);