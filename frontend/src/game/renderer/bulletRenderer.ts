import * as THREE from 'three';
import { BulletSnapshot } from '../../types/game.types';

interface BulletEntity {
  mesh: THREE.Group;
  projectile: THREE.Mesh;
  trailPoints: THREE.Vector3[];
  trailMesh: THREE.Line | null;
  lastPosition: THREE.Vector3;
}

export class BulletRenderer {
  private scene: THREE.Scene;
  private bulletEntities: Map<string, BulletEntity> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('BulletRenderer initialized');
  }

  public update(bullets: BulletSnapshot[]): void {
    for (const bullet of bullets) {
      let entity = this.bulletEntities.get(bullet.id);
      
      if (!entity) {
        console.log('Creating bullet:', bullet.id);
        entity = this.createBulletEntity(bullet);
        this.bulletEntities.set(bullet.id, entity);
      } else {
        this.updateBulletEntity(entity, bullet);
      }
    }
    
    const currentIds = new Set(bullets.map(b => b.id));
    for (const [id, entity] of this.bulletEntities) {
      if (!currentIds.has(id)) {
        console.log('Bullet disappeared:', id);
        this.createHitEffectAtPosition(entity.lastPosition);
        this.removeBullet(id);
      }
    }
  }

  private createBulletEntity(bullet: BulletSnapshot): BulletEntity {
    const group = new THREE.Group();
    
    const projectileGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const projectileMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFFF00,
    });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    group.add(projectile);
    group.position.set(bullet.position.x, 1, bullet.position.z);
    
    this.scene.add(group);
    
    const lastPosition = new THREE.Vector3(bullet.position.x, 1, bullet.position.z);
    
    console.log('Bullet created at:', bullet.position.x, bullet.position.z);
    
    return { 
      mesh: group, 
      projectile, 
      trailPoints: [lastPosition.clone()],
      trailMesh: null,
      lastPosition
    };
  }

  private updateBulletEntity(entity: BulletEntity, bullet: BulletSnapshot): void {
    const newPosition = new THREE.Vector3(bullet.position.x, 1, bullet.position.z);
    entity.mesh.position.copy(newPosition);
    
    if (entity.lastPosition.distanceTo(newPosition) > 0.3) {
      entity.trailPoints.push(newPosition.clone());
      
      if (entity.trailPoints.length > 15) {
        entity.trailPoints.shift();
      }
      
      entity.lastPosition.copy(newPosition);
    }
    
    if (entity.trailMesh) {
      entity.mesh.remove(entity.trailMesh);
      entity.trailMesh.geometry.dispose();
      (entity.trailMesh.material as THREE.Material).dispose();
    }
    
    if (entity.trailPoints.length > 1) {
      const trailGeometry = new THREE.BufferGeometry().setFromPoints(entity.trailPoints);
      const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xFFAA00,
        transparent: true,
        opacity: 0.7,
      });
      entity.trailMesh = new THREE.Line(trailGeometry, trailMaterial);
      
      const offset = entity.mesh.position.clone();
      entity.trailMesh.position.sub(offset);
      
      entity.mesh.add(entity.trailMesh);
    }
  }

  private createHitEffectAtPosition(position: THREE.Vector3): void {
    console.log('Hit effect at:', position);
    
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xFF4444,
      transparent: true,
      opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(geometry, material);
    explosion.position.copy(position);
    
    this.scene.add(explosion);
    
    let scale = 0.5;
    let ticks = 0;
    const expandInterval = setInterval(() => {
      scale += 0.5;
      explosion.scale.setScalar(scale);
      explosion.material.opacity -= 0.13;
      ticks++;
      
      if (ticks >= 6) {
        clearInterval(expandInterval);
        this.scene.remove(explosion);
        explosion.geometry.dispose();
        explosion.material.dispose();
      }
    }, 50);
  }

  private removeBullet(bulletId: string): void {
    const entity = this.bulletEntities.get(bulletId);
    if (!entity) return;
    
    this.scene.remove(entity.mesh);
    entity.projectile.geometry.dispose();
    (entity.projectile.material as THREE.Material).dispose();
    
    if (entity.trailMesh) {
      entity.trailMesh.geometry.dispose();
      (entity.trailMesh.material as THREE.Material).dispose();
    }
    
    this.bulletEntities.delete(bulletId);
    console.log('Bullet removed');
  }

  public dispose(): void {
    for (const [id] of this.bulletEntities) {
      this.removeBullet(id);
    }
  }
}