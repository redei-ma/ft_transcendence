import * as THREE from 'three';
import { PlayerSnapshot, AttackType } from '../../types/game.types';

interface AttackEffect {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

export class AttackRenderer {
  private scene: THREE.Scene;
  private activeEffects: Map<string, AttackEffect> = new Map();
  private readonly MELEE_DURATION = 1000; // 1 secondo (ATTACK_VISUALIZATION)
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(players: PlayerSnapshot[]): void {
    console.log('AttackRenderer.update called with players:', players.length);
  
    players.forEach(p => {
      console.log('  Player:', p.characterName, 'isAttacking:', p.isAttacking, 'attackType:', p.attackType);
    });
    const now = performance.now();

    // Controlla player che stanno attaccando
    for (const player of players) {
      if (player.isAttacking && player.attackType === AttackType.MELEE_ATTACK) {
        // Crea effetto se non esiste già
        if (!this.activeEffects.has(player.id)) {
          this.createMeleeEffect(player, now);
        }
      }
    }

    // Rimuovi effetti scaduti
    for (const [playerId, effect] of this.activeEffects) {
      const elapsed = now - effect.startTime;
      
      if (elapsed >= effect.duration) {
        // Rimuovi
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        (effect.mesh.material as THREE.Material).dispose();
        this.activeEffects.delete(playerId);
      } else {
        // Aggiorna animazione (espansione + fade)
        this.updateEffect(effect, elapsed);
      }
    }
  }

  private createMeleeEffect(player: PlayerSnapshot, startTime: number): void {
    // Ring geometry (ciambella)
    const radius = 2.0; // MELEE_HITBOX_RADIUS
    const geometry = new THREE.RingGeometry(radius * 0.8, radius, 32);
    
    // Colore team
    const color = player.team === 'RED' ? 0xff4444 : 0x0088ff;
    const material = new THREE.MeshBasicMaterial({ 
      color,
      opacity: 0.8
      /* side: THREE.DoubleSide */
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Posiziona sul piano (y = 0.1 per essere sopra griglia)
    mesh.position.set(player.position.x, 2.5, player.position.z);
    mesh.rotation.x = -Math.PI / 2; // Orizzontale
    
    this.scene.add(mesh);
    
    this.activeEffects.set(player.id, {
      mesh,
      startTime,
      duration: this.MELEE_DURATION
    });
    
    console.log('⚔️ Melee attack effect for', player.characterName);
  }

  private updateEffect(effect: AttackEffect, elapsed: number): void {
    const progress = elapsed / effect.duration; // 0 -> 1
    
    // Espansione (da 80% a 120% del raggio)
    const scale = 0.8 + (progress * 0.4);
    effect.mesh.scale.set(scale, scale, 1);
    
    // Fade out
    const material = effect.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.8 * (1 - progress);
  }

  public dispose(): void {
    for (const [, effect] of this.activeEffects) {
      this.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      (effect.mesh.material as THREE.Material).dispose();
    }
    this.activeEffects.clear();
  }
}