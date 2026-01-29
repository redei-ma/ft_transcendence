/**
 * MapRenderer: Disegna muri della mappa.
 * 
 * RESPONSABILITÀ:
 * - Crea BoxGeometry per ogni muro
 * - Gestisce pulizia muri vecchi
 */

import * as THREE from 'three';
import { GameWorld, StaticEntity } from '../../types/game.types';

export class MapRenderer {
  private scene: THREE.Scene;
  private walls: THREE.Mesh[] = []; // Traccia muri per cleanup

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  
  // Disegna mappa ricevuta dal server.
  
  public renderMap(mapData: GameWorld): void {
    console.log('🏗️ Building map:', mapData.id);

    // Pulisci muri vecchi
    this.clearWalls();

    // Crea nuovi muri
    mapData.walls.forEach((wall) => this.createWall(wall));

    console.log('✅ Built', mapData.walls.length, 'walls');
  }

  
  // Crea un singolo muro.
  
  private createWall(wall: StaticEntity): void {
    const geometry = new THREE.BoxGeometry(wall.width, 10, wall.depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Coordinate mapping (Giovanni → Three.js)
    mesh.position.set(
      wall.position.x + wall.width / 2,
      5,
      wall.position.z + wall.depth / 2
    );

    mesh.userData.isWall = true;
    mesh.userData.wallId = wall.id;

    this.scene.add(mesh);
    this.walls.push(mesh); // Traccia per cleanup
  }

  
  // Rimuove tutti i muri dalla scena.
  
  private clearWalls(): void {
    this.walls.forEach((wall) => {
      this.scene.remove(wall);
      wall.geometry.dispose();
      (wall.material as THREE.Material).dispose();
    });
    this.walls = [];
  }

  
  // Cleanup completo.
  
  public dispose(): void {
    this.clearWalls();
  }
}