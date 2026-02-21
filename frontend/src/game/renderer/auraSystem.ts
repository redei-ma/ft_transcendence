import * as THREE from 'three';
import { PlayerSnapshot } from '../../types/game.types';

export interface AuraConfig {
  characterName: string;
  particles: {
    count: number;
    size: number;
    speed: number;
    orbitRadius: number;
  };
  sphere: {
    baseRadius: number;
    attackRadius: number;
  };
  colors: {
    core: number;
    highlight: number;
    glow: number;
  };
  rotation: {
    idle: number;
    attack: number;
  };
}

export class AuraSystem {
  private group: THREE.Group;
  private particleSystem: THREE.Points;
  private coreSphere: THREE.Mesh;
  private config: AuraConfig;
  private currentRotationSpeed: number;
  private currentScale: number;
  private targetScale: number;

  constructor(config: AuraConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.currentRotationSpeed = config.rotation.idle;
    this.currentScale = 1.0;
    this.targetScale = 1.0;

    this.coreSphere = this.createCoreSphere();
    this.particleSystem = this.createParticleSystem();

    this.group.add(this.coreSphere);
    this.group.add(this.particleSystem);
  }

  private createCoreSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(
      this.config.sphere.baseRadius,
      32,
      32
    );
    const material = new THREE.MeshBasicMaterial({
      color: this.config.colors.core,
      transparent: true,
      opacity: 0.2,
    });
    return new THREE.Mesh(geometry, material);
  }

  private createParticleSystem(): THREE.Points {
    const { count, size, orbitRadius } = this.config.particles;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = orbitRadius * (0.8 + Math.random() * 0.4);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color(
        Math.random() > 0.5 ? this.config.colors.core : this.config.colors.highlight
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geometry, material);
  }

  public updateState(player: PlayerSnapshot, deltaTime: number): void {
    if (player.isAttacking && player.attackType === 'melee-attack') {
      this.targetScale = this.config.sphere.attackRadius / this.config.sphere.baseRadius;
      this.currentRotationSpeed = this.config.rotation.attack;
    } else {
      this.targetScale = 1.0;
      this.currentRotationSpeed = this.config.rotation.idle;
    }

    this.currentScale = THREE.MathUtils.lerp(
      this.currentScale,
      this.targetScale,
      0.2
    );

    this.group.scale.setScalar(this.currentScale);

    this.particleSystem.rotation.y += this.currentRotationSpeed * deltaTime;
    this.particleSystem.rotation.x += (this.currentRotationSpeed * 0.5) * deltaTime;

    this.group.visible = !player.isDead;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public dispose(): void {
    this.coreSphere.geometry.dispose();
    (this.coreSphere.material as THREE.Material).dispose();
    this.particleSystem.geometry.dispose();
    (this.particleSystem.material as THREE.Material).dispose();
  }
}