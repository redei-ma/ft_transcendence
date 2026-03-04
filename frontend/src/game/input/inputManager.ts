import { socketService } from '../../services/socketServices';
import { GameEvents } from '../game.events';
import { AttackType } from '../../types/game.types';
import { log } from '../../configs/logger';

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

  // Traccia quali attacchi sono già stati inviati
  // Viene resettato al keyup — così l'attacco parte UNA volta per pressione
  private attackSent: { [playerIndex: number]: boolean } = { 0: false, 1: false };

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
    // Blocca TUTTI i default del browser durante il gioco
    const key = e.key.toLowerCase();
    
    // Blocca combinazioni con Ctrl (Ctrl+S, Ctrl+W, ecc.)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Blocca tasti singoli problematici
    if ([
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      ' ', 'shift', 'control', 'tab', 'alt', 'meta',
      'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
      '1', '2', '3',
    ].includes(key)) {
      e.preventDefault();
    }

    this.keys.add(key);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.delete(key);

    // Reset attack sent per P0
    if (key === ' ' || key === 'shift' || key === 'control') {
      this.attackSent[0] = false;
    }
    // Reset attack sent per P1
    if (key === '1' || key === '2' || key === '3') {
      this.attackSent[1] = false;
    }
  };

  private sendInputs(): void {
    // P1: WASD + Space(melee) / Shift(spell) / Ctrl(defence)
    const p0 = this.buildPayload(
      'w', 's', 'a', 'd',
      ' ', 'shift', 'control',
      0
    );
    if (p0.attackType) console.log('P0 attack:', p0.attackType);
    socketService.emit(GameEvents.INPUT, p0);

    // P2: Frecce + 1(melee) / 2(spell) / 3(defence)
    if (this.isLocalGame) {
      const p1 = this.buildPayload(
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        '1', '2', '3',
        1
      );
      if (p1.attackType) console.log('P1 attack:', p1.attackType);
      socketService.emit(GameEvents.INPUT, p1);
    }
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

    // Attacco: manda SOLO una volta per pressione
    let attackType: AttackType | undefined = undefined;

    if (!this.attackSent[playerIndex]) {
      if (this.keys.has(defenceKey)) {
        attackType = AttackType.DEFENCE_ATTACK;
        this.attackSent[playerIndex] = true;
      } else if (this.keys.has(meleeKey)) {
        attackType = AttackType.MELEE_ATTACK;
        this.attackSent[playerIndex] = true;
      } else if (this.keys.has(spellKey)) {
        attackType = AttackType.SPELL_ATTACK;
        this.attackSent[playerIndex] = true;
      }
    }

    const payload: GameInputPayload = {
      x: Math.round(mapX),
      z: Math.round(mapZ),
      playerIndex,
    };

    // Manda attackType solo se presente — @IsOptional nel DTO
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
  }
}