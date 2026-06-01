import { socketService } from '../../services/socketServices';
import { GameEvents } from '@transcendence/types';
import { AttackType } from '@transcendence/types';
import { log } from '../../configs/logger';
import aimCursorUrl from '../../assets/images/AimCursor.png';

interface GameInputPayload {
  x: number;
  z: number;
  attackType?: AttackType;
  playerIndex: number;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isLocalGame: boolean;
  private attackSent: { [playerIndex: number]: boolean } = { 0: false, 1: false };
  
  // Mouse aim
  private isAiming: boolean = false;
  private pendingSpellDirection: { x: number; z: number } | null = null;

  constructor(isLocalGame: boolean = true) {
    this.isLocalGame = isLocalGame;
    log.input('InputManager initialized, local:', isLocalGame);
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.intervalId = setInterval(() => this.sendInputs(), 50);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.code.startsWith('Shift') ? e.code.toLowerCase() : e.key.toLowerCase();

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
    }

    if ([
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      ' ', 'shiftleft', 'shiftright', 'control', 'tab', 'alt', 'meta',
      'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
      'p', 'o', 'i',
    ].includes(key)) {
      e.preventDefault();
    }

    this.keys.add(key);

    // Attiva aim mode quando Shift è premuto (solo single player)
    if (key === 'shiftleft' && !this.isLocalGame) {
      this.isAiming = true;
      document.body.style.cursor = `url(${aimCursorUrl}) 16 16, crosshair`;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.code.startsWith('Shift') ? e.code.toLowerCase() : e.key.toLowerCase();
    this.keys.delete(key);

    if (key === ' ' || key === 'shiftleft' || key === 'c') {
      this.attackSent[0] = false;
    }
    if (key === 'p' || key === 'o' || key === 'i') {
      this.attackSent[1] = false;
    }

    // Disattiva aim mode
    if (key === 'shiftleft') {
      this.isAiming = false;
      document.body.style.cursor = '';
    }
  };

  
  private playerPosition: { x: number; z: number } | null = null;
  
  public setPlayerPosition(x: number, z: number): void {
    this.playerPosition = { x, z };
  }
  
  public fireSpellAt(worldX: number, worldZ: number): void {
    console.log("[InputManager] fireSpellAt:", worldX, worldZ, "playerPos:", this.playerPosition);
    if (!this.playerPosition) return;
    
    const dx = worldX - this.playerPosition.x;
    const dz = worldZ - this.playerPosition.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length < 0.1) return;
    
    this.pendingSpellDirection = {
      x: Math.max(-1, Math.min(1, dx / length)),
      z: Math.max(-1, Math.min(1, dz / length)),
    };
  }
  
  private sendInputs(): void {
    if (!socketService.isConnected()) return;
    
    const p0 = this.buildPayload(
      'w', 's', 'a', 'd',
      ' ', 'shiftleft', 'c',
      0
    );
    
    // Se c'è uno spell pendente dal mouse, sovrascrivilo
    if (this.pendingSpellDirection) {
      p0.x = this.pendingSpellDirection.x;
      p0.z = this.pendingSpellDirection.z;
      p0.attackType = AttackType.SPELL_ATTACK;
      this.pendingSpellDirection = null;
    }
    
    if (p0.attackType) console.log('P0 attack payload:', JSON.stringify(p0));
    socketService.emit(GameEvents.INPUT, p0);
    
    if (this.isLocalGame) {
      const p1 = this.buildPayload(
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        'p', 'o', 'i',
        1
      );
      if (p1.attackType) console.log('P1 attack:', p1.attackType);
      socketService.emit(GameEvents.INPUT, p1);
    }
  }
  
  public getIsLocal(): boolean {
    return this.isLocalGame;
  }
  
  private buildPayload(
    upKey: string, downKey: string, leftKey: string, rightKey: string,
    meleeKey: string, spellKey: string, defenceKey: string,
    playerIndex: number,
  ): GameInputPayload {
    let screenX = 0;
    let screenZ = 0;

    if (this.keys.has(upKey))    screenZ -= 1;
    if (this.keys.has(downKey))  screenZ += 1;
    if (this.keys.has(leftKey))  screenX -= 1;
    if (this.keys.has(rightKey)) screenX += 1;

    const angle = Math.PI / 4;
    const mapX = screenX * Math.cos(angle) + screenZ * Math.sin(angle);
    const mapZ = -screenX * Math.sin(angle) + screenZ * Math.cos(angle);

    let attackType: AttackType | undefined = undefined;

    if (!this.attackSent[playerIndex]) {
    if (this.keys.has(defenceKey)) {
      attackType = AttackType.DEFENCE_ATTACK;
      this.attackSent[playerIndex] = true;
    } else if (this.keys.has(meleeKey)) {
      attackType = AttackType.MELEE_ATTACK;
      this.attackSent[playerIndex] = true;
    } else if (this.keys.has(spellKey) && (this.isLocalGame || playerIndex === 1)) {
      attackType = AttackType.SPELL_ATTACK;
      this.attackSent[playerIndex] = true;
    }
  }

    const payload: GameInputPayload = {
      x: Math.round(mapX),
      z: Math.round(mapZ),
      playerIndex,
    };

    if (attackType) {
      payload.attackType = attackType;
    }

    return payload;
  }

  public dispose(): void {
    log.input('InputManager disposing');
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Ripristina cursore
    document.body.style.cursor = '';
  }
}