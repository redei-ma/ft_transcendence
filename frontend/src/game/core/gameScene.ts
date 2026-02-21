/**
 * GameScene: Setup e gestione della scena Three.js.
 * 
 * RESPONSABILITÀ:
 * - Crea scene, renderer, luci
 * - Gestisce resize
 * - Fornisce game loop
 */

import * as THREE from 'three';
import { GameConfig } from '../../configs/config';

export class GameScene {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  
  private animationId: number | null = null;

  constructor(canvas: HTMLDivElement) {

    // -------------------- SCENE --------------------
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // -------------------- RENDERER --------------------
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    canvas.appendChild(this.renderer.domElement);

    // -------------------- LUCI -------------------------
    this.setupLights();

    // --------------- GRIGLIA PLACEHOLDER ---------------
    this.addGrid();

    // --------------- RESIZE HANDLER ---------------
    window.addEventListener('resize', this.handleResize);
  }

  // Setup luci della scena.
  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);
  }
  
  // Aggiunge griglia helper (placeholder arena).
  private addGrid(): void {
    const centerX = GameConfig.MAP.WIDTH / 2;
    const centerZ = GameConfig.MAP.DEPTH / 2;

    const grid = new THREE.GridHelper(
      GameConfig.MAP.WIDTH,
      20,
      0xffffff,
      0x444444
    );
    grid.position.set(centerX, 0, centerZ);
    this.scene.add(grid);
  }
  
  // Gestisce resize finestra.
  private handleResize = (): void => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // Avvia game loop.
  // @param callback - Funzione chiamata ogni frame (per update logica)
  public startLoop(callback: (delta: number) => void): void {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      this.animationId = requestAnimationFrame(animate);

      const delta = (currentTime - lastTime) / 1000; // Secondi
      lastTime = currentTime;

      callback(delta); // Update logica gioco
    };

    animate(performance.now());
  }

  // Ferma game loop.
  public stopLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Cleanup (chiamato quando esci dal gioco).
  public dispose(): void {
    this.stopLoop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}