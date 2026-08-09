import { useGLTF, Clone } from '@react-three/drei';
import pillarModelUrl from '../../assets/models/PillarOpt.glb?url';
import wallModelUrl from '../../assets/models/Wall.glb?url';

interface WallModelProps {
  position: [number, number, number];
  width: number;
  depth: number;
}

interface PillarModelProps {
  position: [number, number, number];
  radius: number;
}

// Clone di drei: copia la mesh GLTF senza skinning — a differenza di SkeletonUtils.clone, qui va bene scene.clone()
// perché pillar e wall sono geometrie statiche senza rig.
export function WallModel({ position, width, depth }: WallModelProps) {
  const { scene } = useGLTF(wallModelUrl);
  const cloned = scene.clone();
  
  return (
    <Clone
      object={cloned}
      position={position}
      scale={[width, 5, depth]}
    />
  );
}

useGLTF.preload(wallModelUrl);

export function PillarModel({ position, radius }: PillarModelProps) {
  const { scene } = useGLTF(pillarModelUrl);
  const cloned = scene.clone();
  
  return (
    <Clone
      object={cloned}
      position={position}
      scale={[radius * 2, radius * 2, radius * 2]}
    />
  );
}

useGLTF.preload(pillarModelUrl);