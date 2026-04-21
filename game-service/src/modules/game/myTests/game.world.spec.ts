import { World } from '../core/game.world';
import { Vector } from '../utils/game.vector';
import { GameConfig } from '../configs/game.config';
import { MapData, CharacterName } from '../interfaces-enums';

describe('World', () => {
    let world: World;
    let mockMapData: MapData;

    beforeEach(() => {
        // Creiamo una minimappa 100x100 finta per i test
        mockMapData = {
            meta: { name: 'test-map', version: '1.0' },
            settings: { width: 100, depth: 100, maxPlayers: 4 },
            spawn_points: [
                { id: "sp1", x: 10, z: 10 },
                { id: "sp2", x: 90, z: 90 }
            ],
            // Mettiamo un muro ESATTAMENTE al centro della mappa
            walls: [
                { id: 'wall1', x: 40, z: 40, width: 20, depth: 20 }
            ],
            pillars: [
                { id: 'pillar1', x: 80, z: 80, radius: 5 }
            ]
        } as unknown as MapData;

        world = new World(mockMapData);
    });

    // ---------------------------------------------------------
    // TEST PER: Inizializzazione e Parsing della mappa
    // ---------------------------------------------------------
    describe('Costruttore', () => {
        it('dovrebbe inizializzare le proprietà base della mappa', () => {
            expect(world.id).toBe('test-map');
            expect(world.width).toBe(100);
            expect(world.depth).toBe(100);
            expect(world.getMaxPlayers()).toBe(4);
        });

        it('dovrebbe parsare correttamente i muri, i pillar e gli spawn point', () => {
            expect(world.spawnPoints.length).toBe(2);
            expect(world.spawnPoints[0].x).toBe(10);
            expect(world.walls.length).toBe(1);
            expect(world.pillars.length).toBe(1);
        });

        it('dovrebbe pre-allocare esattamente MAX_BULLETS proiettili disattivati', () => {
            expect(world.bullets.length).toBe(world.MAX_BULLETS);
            expect(world.bullets[0].isActive).toBe(false); // Il primo proiettile deve essere spento
        });
    });

    // ---------------------------------------------------------
    // TEST PER: L'Object Pooling dei proiettili (spawnBullet)
    // ---------------------------------------------------------
    describe('spawnBullet', () => {
        it('dovrebbe attivare un proiettile e assegnargli i dati corretti', () => {
            const pos = new Vector(10, 10);
            const dir = new Vector(1, 0);
            
            world.spawnBullet('player1', CharacterName.ZEUS, 1, pos, dir, 5, 2);

            const bullet = world.bullets[0];
            expect(bullet.isActive).toBe(true);
            expect(bullet.ownerId).toBe('player1');
            expect(bullet.characterName).toBe(CharacterName.ZEUS);
            expect(bullet.position.x).toBe(10);
            expect(bullet.speed).toBe(5);
        });

        it('dovrebbe riciclare i proiettili quando si supera il limite MAX_BULLETS', () => {
            const pos = new Vector(0, 0);
            const dir = new Vector(1, 0);

            // Spariamo un numero di proiettili pari al limite MASSIMO + 1
            for (let i = 0; i <= world.MAX_BULLETS; i++) {
                world.spawnBullet(`player${i}`, CharacterName.ZEUS, 1, pos, dir, 5, 2);
            }

            // Il proiettile all'indice 0 (il primo sparato in assoluto)
            // deve essere stato SOVRASCRITTO dall'ultimo sparo (object pooling funzionante!)
            expect(world.bullets[0].ownerId).toBe(`player${world.MAX_BULLETS}`);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: Collisioni con i Muri e la Griglia
    // ---------------------------------------------------------
    describe('isWallCollision', () => {
        it('dovrebbe restituire FALSE se il giocatore è in uno spazio vuoto', () => {
            // Ricorda: abbiamo messo il muro in x:40, z:40. 
            // Se testiamo x:10, z:10, non deve esserci collisione.
            const playerPos = new Vector(10, 10);
            const radius = 2;
            const isColliding = world.isWallCollision(playerPos, radius);
            
            expect(isColliding).toBe(false);
        });

        it('dovrebbe restituire TRUE se il giocatore è letteralmente dentro il muro', () => {
            // Muro da 40 a 60. Il punto 50,50 è esattamente il centro del muro.
            const playerPos = new Vector(50, 50);
            const radius = 2;
            const isColliding = world.isWallCollision(playerPos, radius);
            
            expect(isColliding).toBe(true);
        });

        it('dovrebbe restituire TRUE se il giocatore tocca solo il bordo del muro', () => {
            // Muro inizia a x:40. Il giocatore è a x:39 con un raggio di 2.
            // 39 + 2 = 41 -> Entra nel muro! Collisione.
            const playerPos = new Vector(39, 40);
            const radius = 2;
            const isColliding = world.isWallCollision(playerPos, radius);
            
            expect(isColliding).toBe(true);
        });

        it('dovrebbe restituire FALSE se il giocatore sfiora il muro ma non lo tocca', () => {
            // Muro inizia a x:40. Il giocatore è a x:37 con un raggio di 2.
            // 37 + 2 = 39 -> Non tocca il 40! Nessuna collisione.
            const playerPos = new Vector(37, 40);
            const radius = 2;
            const isColliding = world.isWallCollision(playerPos, radius);
            
            expect(isColliding).toBe(false);
        });
    });
});