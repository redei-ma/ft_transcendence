// import { useRef, useMemo } from 'react';
// import { useGLTF } from '@react-three/drei';
// import { useFrame } from '@react-three/fiber';
// import * as THREE from 'three';
// import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
// import { CharacterName, GameConfig } from '@transcendence/types';
// import { useGameStore } from '../../storage/gameStore';

// const MODEL_PATHS: Record<string, string> = {
//   [CharacterName.ZEUS]: '/models/Zeus.glb',
//   [CharacterName.ADE]: '/models/Hades.glb',
// };

// // Torniamo alla TUA scala visiva corretta
// const VISUAL_TARGET_HEIGHT = 0.06;
// const MODEL_ROTATION_OFFSET = Math.PI/2;

// interface PlayerModelProps {
//   characterName: CharacterName;
//   playerId: string;
// }

// export function PlayerModel({ characterName, playerId }: PlayerModelProps) {
//   const groupRef = useRef<THREE.Group>(null);
//   const modelRef = useRef<THREE.Group>(null);
//   const { scene } = useGLTF(MODEL_PATHS[characterName]);
//   const currentOpacity = useRef(1);

//   const { clonedScene, computedScale, offset } = useMemo(() => {
//     // LOG sulla scena ORIGINALE, non sul clone
//     const origBox = new THREE.Box3().setFromObject(scene);
//     const origSize = new THREE.Vector3();
//     origBox.getSize(origSize);
//     console.log(`[MODEL] ${characterName} ORIGINAL size: x=${origSize.x.toFixed(1)} y=${origSize.y.toFixed(1)} z=${origSize.z.toFixed(1)}`);

//     const clone = SkeletonUtils.clone(scene);

//     clone.traverse((child) => {
//       if ((child as THREE.Mesh).isMesh) {
//         const mesh = child as THREE.Mesh;
//         mesh.frustumCulled = false;
//         if (Array.isArray(mesh.material)) {
//           mesh.material = mesh.material.map(m => m.clone());
//         } else {
//           mesh.material = mesh.material.clone();
//         }
//       }
//     });

//     const box = new THREE.Box3().setFromObject(clone);
//     const size = new THREE.Vector3();
//     box.getSize(size);
//     const maxDim = Math.max(size.x, size.y, size.z);
    
//     const scale = VISUAL_TARGET_HEIGHT / maxDim;

//     // Calcoliamo l'offset per mettere i piedi a y=0 tenendo conto della nuova scala.
//     // NON centiamo X e Z qui, ci fidiamo del pivot nativo del modello .glb per non sfasarlo.
//     const scaledMinY = box.min.y * scale;

//     return { 
//       clonedScene: clone, 
//       computedScale: scale,
//       offset: new THREE.Vector3(0, -scaledMinY, 0)
//     };
//   }, [scene]);

//   useFrame((_, delta) => {
//     const player = useGameStore.getState().gameState?.players.find(p => p.id === playerId);
//     if (!player) return;

//     const targetOpacity = player.isDead ? 0.2 : 1;
//     if (currentOpacity.current === targetOpacity) return;

//     // Interpolazione opacità
//     const lerpFactor = GameConfig.RENDERING.INTERPOLATION_SPEED * (delta * 60);
//     currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, lerpFactor);
    
//     clonedScene.traverse((child) => {
//       if ((child as THREE.Mesh).isMesh) {
//         const mesh = child as THREE.Mesh;
//         const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
//         for (const mat of materials) {
//           mat.transparent = currentOpacity.current < 1;
//           mat.opacity = currentOpacity.current;
//         }
//       }
//     });
//   });

//   return (
//     <group ref={groupRef}>
//       <group ref={modelRef} rotation={[0, MODEL_ROTATION_OFFSET, 0]}>
//         <primitive 
//           object={clonedScene} 
//           scale={computedScale} 
//           position={[offset.x, offset.y, offset.z]} 
//         />
//       </group>
//     </group>
//   );
// }

// useGLTF.preload(MODEL_PATHS[CharacterName.ZEUS]);
// useGLTF.preload(MODEL_PATHS[CharacterName.ADE]);

import { useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CharacterName, GameConfig } from '@transcendence/types';
import { useGameStore } from '../../storage/gameStore';

const MODEL_PATHS: Record<string, string> = {
  [CharacterName.ZEUS]: '/models/Zeus.glb',
  [CharacterName.ADE]: '/models/Hades.glb',
};

// Derivati dal config — se PLAYER.RADIUS cambia, tutto si riscala
const MODEL_HEIGHT = GameConfig.PLAYER.RADIUS * 3;
const MODEL_ROTATION_OFFSET = Math.PI / 2;

interface PlayerModelProps {
  characterName: CharacterName;
  playerId: string;
}

export function PlayerModel({ characterName, playerId }: PlayerModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_PATHS[characterName]);
  const currentOpacity = useRef(1);

  const { clonedScene, computedScale, offsetY } = useMemo(() => {
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

    // Calcola la scala dal modello originale (non dal clone — evita bbox zero su skinned mesh)
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const nativeHeight = size.y;

    // Scala per raggiungere MODEL_HEIGHT
    const scale = nativeHeight > 0 ? MODEL_HEIGHT / nativeHeight : 1;

    // Offset Y per piedi a terra
    const scaledMinY = box.min.y * scale;

    return {
      clonedScene: clone,
      computedScale: scale,
      offsetY: -scaledMinY,
    };
  }, [scene]);

  // Transient update: opacità ghost
  useFrame(() => {
    const player = useGameStore.getState().gameState?.players.find(p => p.id === playerId);
    if (!player) return;

    const targetOpacity = player.isDead ? 0.2 : 1;
    if (Math.abs(currentOpacity.current - targetOpacity) < 0.01) {
      if (currentOpacity.current !== targetOpacity) {
        currentOpacity.current = targetOpacity;
        applyOpacity(clonedScene, targetOpacity);
      }
      return;
    }

    currentOpacity.current += (targetOpacity - currentOpacity.current) * 0.1;
    applyOpacity(clonedScene, currentOpacity.current);
  });

  return (
    <group ref={groupRef}>
      <group rotation={[0, MODEL_ROTATION_OFFSET, 0]}>
        <primitive
          object={clonedScene}
          scale={computedScale}
          position={[0, offsetY, 0]}
        />
      </group>
    </group>
  );
}

function applyOpacity(scene: THREE.Object3D, opacity: number) {
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        mat.transparent = opacity < 1;
        mat.opacity = opacity;
      }
    }
  });
}

useGLTF.preload(MODEL_PATHS[CharacterName.ZEUS]);
useGLTF.preload(MODEL_PATHS[CharacterName.ADE]);