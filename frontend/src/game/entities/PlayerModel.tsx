import { useRef, useMemo, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CharacterName, GameConfig } from '@transcendence/types';
import { useGameStore } from '../../storage/gameStore';
import zeusModelUrl from '../../assets/models/ZeusWalking.glb?url';
import hadesModelUrl from '../../assets/models/HadesWalking.glb?url';

const MODEL_PATHS: Record<string, string> = {
  [CharacterName.ZEUS]: zeusModelUrl,
  [CharacterName.ADE]: hadesModelUrl,
};

const MODEL_HEIGHT = GameConfig.PLAYER.RADIUS * 3;
const MODEL_ROTATION_OFFSET = Math.PI / 2;

interface PlayerModelProps {
  characterName: CharacterName;
  playerId: string;
}

export function PlayerModel({ characterName, playerId }: PlayerModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // 1. Estraiamo anche le animazioni dal file GLTF
  const { scene, animations } = useGLTF(MODEL_PATHS[characterName]);
  const currentOpacity = useRef(1);

  // useMemo: clona la scena GLTF una sola volta per istanza.
  // SkeletonUtils.clone è necessario per i modelli con skinning: clone() standard non copia il rig correttamente.
  // I materiali vengono clonati individualmente per permettere opacità indipendente per ogni giocatore.
  const { clonedScene, computedScale, offsetY } = useMemo(() => { // useMemo: eseguito una sola volta (deps=[scene]); ricalcola solo se il file GLTF cambia
    const clone = SkeletonUtils.clone(scene);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.frustumCulled = false;
        // Clone del materiale: senza questo tutti i modelli condividono lo stesso materiale
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const nativeHeight = size.y;

    const scale = nativeHeight > 0 ? MODEL_HEIGHT / nativeHeight : 1;
    const scaledMinY = box.min.y * scale;

    return {
      clonedScene: clone,
      computedScale: scale,
      offsetY: -scaledMinY,
    };
  }, [scene]);

  // 2. Agganciamo le animazioni al clone
  const { actions } = useAnimations(animations, groupRef);
  const isCurrentlyMoving = useRef(false); // useRef: stato booleano che NON deve triggerare re-render quando cambia
  const lastVisualPos = useRef(new THREE.Vector3()); // useRef: valore mutabile persistente tra frame; aggiornato in useFrame senza re-render

  // useFrame: per-frame — gestisce opacità (lerp su morte) e attivazione/disattivazione animazione walk.
  // Legge lo store con getState() senza ri-renderizzare il componente React.
  useFrame(() => { // nessun delta qui: l'opacità usa un fattore fisso 0.1 (dipendente dal frame rate, accettabile per estetica)
    const player = useGameStore.getState().gameState?.players.find(p => p.id === playerId);
    if (!player || !groupRef.current) return;

    // --- GESTIONE OPACITÀ ---
    const targetOpacity = player.isDead ? 0.2 : 1;
    if (Math.abs(currentOpacity.current - targetOpacity) > 0.01) {
      currentOpacity.current += (targetOpacity - currentOpacity.current) * 0.1;
      applyOpacity(clonedScene, currentOpacity.current);
    } else if (currentOpacity.current !== targetOpacity) {
      currentOpacity.current = targetOpacity;
      applyOpacity(clonedScene, targetOpacity)
    }

    // --- GESTIONE ANIMAZIONI ---
    // Rileva il movimento confrontando la posizione world reale del Group (già interpolata) frame per frame
    const currentWorldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(currentWorldPos);

    const dist = lastVisualPos.current.distanceTo(currentWorldPos);
    const isMovingNow = dist > 0.005 && !player.isDead; // Non animiamo i fantasmi morti!

    if (isMovingNow !== isCurrentlyMoving.current) {
      isCurrentlyMoving.current = isMovingNow;
      
      if (animations.length > 0) {
        const walkAnimName = animations[0].name; 
        const action = actions[walkAnimName];

        if (action) {
          if (isMovingNow) {
            action.reset().fadeIn(0.2).play(); // Inizia a camminare morbido
          } else {
            action.fadeOut(0.2); // Smette di camminare
          }
        }
      }
    }
    
    lastVisualPos.current.copy(currentWorldPos);
  });

  return (
    // ⚡ groupRef deve stare qui per far funzionare useAnimations
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

// Preload dei file
useGLTF.preload(zeusModelUrl);
useGLTF.preload(hadesModelUrl);