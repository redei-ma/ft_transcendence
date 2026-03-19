// import { useRef } from 'react';
// import { useFrame } from '@react-three/fiber';
// import * as THREE from 'three';
// import { CharacterName } from '@transcendence/types';
// import { ZeusAura } from './ZeusAura';
// import { AdeAura } from './AdeAura';
// import { PlayerModel } from './PlayerModel';
// import { useGameStore } from '../../storage/gameStore';

// interface PlayerEntityProps {
//   playerId: string;
// }

// export function PlayerEntity({ playerId }: PlayerEntityProps) {
//   const groupRef = useRef<THREE.Group>(null);
//   const initialPlayer = useGameStore((state) =>
//     state.gameState?.players.find(p => p.id === playerId)
//   );

//   useFrame((_, delta) => {
//     if (!groupRef.current) return;

//     const currentPlayer = useGameStore.getState().gameState?.players.find(
//       p => p.id === playerId
//     );
//     if (!currentPlayer) return;

//     const target = new THREE.Vector3(currentPlayer.position.x, 0, currentPlayer.position.z);
//     groupRef.current.position.lerp(target, 1 - Math.pow(0.001, delta));
//     groupRef.current.rotation.y = currentPlayer.rotation;
//   });

//   if (!initialPlayer) return null;

//   return (
//     <group ref={groupRef}>
//       <PlayerModel characterName={initialPlayer.characterName} playerId={playerId} />

//       {initialPlayer.characterName === CharacterName.ZEUS ? (
//         <ZeusAura playerId={playerId} />
//       ) : (
//         <AdeAura playerId={playerId} />
//       )}
//     </group>
//   );
// }
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CharacterName } from '@transcendence/types';
import { ZeusAura } from './ZeusAura';
import { AdeAura } from './AdeAura';
import { PlayerModel } from './PlayerModel';
import { useGameStore } from '../../storage/gameStore';

interface PlayerEntityProps {
  playerId: string;
}

export function PlayerEntity({ playerId }: PlayerEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const initialPlayer = useGameStore((state) =>
    state.gameState?.players.find(p => p.id === playerId)
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const currentPlayer = useGameStore.getState().gameState?.players.find(
      p => p.id === playerId
    );
    if (!currentPlayer) return;

    const target = new THREE.Vector3(currentPlayer.position.x, 0, currentPlayer.position.z);
    groupRef.current.position.lerp(target, 1 - Math.pow(0.001, delta));

    // Inversione della rotazione: il server manda la rotazione con convenzione opposta
    // a quella del modello — negando il valore si allinea su/giù
    groupRef.current.rotation.y = -currentPlayer.rotation;
  });

  if (!initialPlayer) return null;

  return (
    <group ref={groupRef}>
      <PlayerModel characterName={initialPlayer.characterName} playerId={playerId} />

      {initialPlayer.characterName === CharacterName.ZEUS ? (
        <ZeusAura playerId={playerId} />
      ) : (
        <AdeAura playerId={playerId} />
      )}
    </group>
  );
}