import * as THREE from 'three';
import { PlayerSnapshot } from '../../types/game.types';
import { AuraSystem } from '../renderer/auraSystem';
import { AURA_CONFIG } from '../../configs/auraConfig';

interface PlayerEntity {
  characterMesh: THREE.Mesh;
  auraSystem: AuraSystem;
  group: THREE.Group;
}

export class PlayerWithAuraRenderer {
  private scene: THREE.Scene;
  private playerEntities: Map<string, PlayerEntity> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(players: PlayerSnapshot[], deltaTime: number): void {
    for (const player of players) {
      let entity = this.playerEntities.get(player.id);

      if (!entity) {
        entity = this.createPlayerEntity(player);
        this.playerEntities.set(player.id, entity);
      } else {
        this.updatePlayerEntity(entity, player, deltaTime);
      }
    }

    const currentIds = new Set(players.map(p => p.id));
    for (const [id] of this.playerEntities) {
      if (!currentIds.has(id)) {
        this.removePlayerEntity(id);
      }
    }
  }

  private createPlayerEntity(player: PlayerSnapshot): PlayerEntity {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const bodyColor = player.team === 'BLUE' ? 0x00008B : 0x8B0000;
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    const characterMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    characterMesh.position.y = 0.8;

    const auraConfig = player.characterName === 'Zeus' 
      ? AURA_CONFIG.zeus 
      : AURA_CONFIG.ade;
    const auraSystem = new AuraSystem(auraConfig);

    const auraGroup = auraSystem.getGroup();
    auraGroup.position.set(0, 0.8, 0);

    group.add(characterMesh);
    group.add(auraGroup);

    group.position.set(player.position.x, 0, player.position.z);

    group.userData.playerId = player.id;
    group.userData.characterName = player.characterName;

    this.scene.add(group);

    console.log('Created player with aura:', player.characterName);

    return { characterMesh, auraSystem, group };
  }

  private updatePlayerEntity(
    entity: PlayerEntity,
    player: PlayerSnapshot,
    deltaTime: number
  ): void {
    entity.group.position.set(player.position.x, 0, player.position.z);
    entity.characterMesh.rotation.y = player.rotation;
    if (player.isDead) {  
      entity.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = Math.max(0.2, mat.opacity - deltaTime * 2); // Fade in 0.5s
        }
        if (child instanceof THREE.Points) {
          const mat = child.material as THREE.PointsMaterial;
          mat.opacity = Math.max(0.1, mat.opacity - deltaTime * 2);
        }
    });
  } else {
    // Ripristina opacity normale se respawna
    entity.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.transparent = false;
        mat.opacity = 1.0;
      }
      if (child instanceof THREE.Points) {
        const mat = child.material as THREE.PointsMaterial;
        mat.opacity = 0.8;
      }
    });
  }
  
  // Update aura (continua a funzionare)
  entity.auraSystem.updateState(player, deltaTime);
    entity.auraSystem.updateState(player, deltaTime);
  }

  private removePlayerEntity(playerId: string): void {
    const entity = this.playerEntities.get(playerId);
    if (!entity) return;

    this.scene.remove(entity.group);
    entity.characterMesh.geometry.dispose();
    (entity.characterMesh.material as THREE.Material).dispose();
    entity.auraSystem.dispose();

    this.playerEntities.delete(playerId);
  }

  public dispose(): void {
    for (const [id] of this.playerEntities) {
      this.removePlayerEntity(id);
    }
  }
}