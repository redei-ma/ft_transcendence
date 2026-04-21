import { Vector } from '../../types/game.types';

interface WallData {
  id: string;
  position: Vector;
  width: number;
  depth: number;
}

interface GameArenaProps {
  mapData: {
    walls: WallData[];
    width: number;
    depth: number;
  };
}

export function GameArena({ mapData }: GameArenaProps) {
  const walls = mapData?.walls;
  if (!walls || !Array.isArray(walls)) {
    return null;
  }

  return (
    <group>
      {walls.map((wall) => (
        <mesh
          key={wall.id}
          position={[
            wall.position.x + wall.width / 2,
            5,
            wall.position.z + wall.depth / 2,
          ]}
        >
          <boxGeometry args={[wall.width, 10, wall.depth]} />
          <meshStandardMaterial color={0xff0000} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}