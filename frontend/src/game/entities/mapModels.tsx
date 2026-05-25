import { useGLTF, Clone } from '@react-three/drei';

interface WallModelProps {
  position: [number, number, number];
  width: number;
  depth: number;
}

interface PillarModelProps {
  position: [number, number, number];
  radius: number;
}

export function WallModel({ position, width, depth }: WallModelProps) {
  const { scene } = useGLTF('/models/Wall.glb');
  const cloned = scene.clone();
  
  return (
    <Clone
      object={cloned}
      position={position}
      scale={[width, 5, depth]}
    />
  );
}

useGLTF.preload('/models/Wall.glb');

export function PillarModel({ position, radius }: PillarModelProps) {
  const { scene } = useGLTF('/models/PillarOpt.glb');
  const cloned = scene.clone();
  
  return (
    <Clone
      object={cloned}
      position={position}
      scale={[radius * 2, radius * 2, radius * 2]}
    />
  );
}

useGLTF.preload('/models/PillarOpt.glb');