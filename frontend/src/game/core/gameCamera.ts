import * as THREE from 'three';
import { GameConfig } from '../../configs/config';

export class GameCamera {
  public camera: THREE.OrthographicCamera;

  constructor() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 120;

    // Camera ortografica (isometrica)
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );

    // Posizione isometrica
    const centerX = GameConfig.MAP.WIDTH / 2;
    const centerZ = GameConfig.MAP.DEPTH / 2;

    this.camera.position.set(centerX + 80, 100, centerZ + 80);
    this.camera.lookAt(centerX, 0, centerZ);
    this.camera.zoom = GameConfig.RENDERING.CAMERA.ZOOM;
    this.camera.updateProjectionMatrix();
  }

  // Aggiorna camera su resize.
  public updateAspect(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 120;

    this.camera.left = (frustumSize * aspect) / -2;
    this.camera.right = (frustumSize * aspect) / 2;
    this.camera.updateProjectionMatrix();
  }
}