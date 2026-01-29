export const GameConfig = {
  SERVER: {
    TICK_RATE: 16,
    DT: 0.016,
  },
  MAP: {
    CELL_SIZE: 5.0,
    WIDTH: 200,
    DEPTH: 200,
  },
  PLAYER: {
    DEFAULT_HP: 100,
    SPEED: 10.0,
    RADIUS: 5.0,
    HEIGHT: 10.0,
    SPAWN_POINTS: [
      { x: 5, z: 195 },
      { x: 195, z: 5 },
    ],
  },
  COMBAT: {
    MELEE_DAMAGE: 10,
    COOLDOWN_MELEE_ATTACK: 50,
    MELEE_HITBOX_RADIUS: 8.0,
    ATTACK_RANGE_OFFSET: 5.0,
  },
  RENDERING: {
    CAMERA: {
      ZOOM: 1,
      HEIGHT: 150,
      ANGLE: Math.PI / 4, // 45°
    },
    INTERPOLATION_SPEED: 0.15,
  },
};