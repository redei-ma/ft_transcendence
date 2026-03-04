import { PhysicsSystem } from '../systems/game.physicsSystem';
import { Vector } from '../utils/game.vector';
import { BulletHit, Player, Bullet } from '../interfaces-enums';
import { World } from '../core/game.world';

describe('PhysicsSystem', () => {
    let physicsSystem: PhysicsSystem;
    let mockWorld: any;
    let playersMap: Map<string, Player>;

    beforeEach(() => {
        physicsSystem = new PhysicsSystem();
        playersMap = new Map();

        // Creiamo un finto mondo di gioco
        mockWorld = {
            isWallCollision: jest.fn().mockReturnValue(false),
            pillars: [
                { position: new Vector(10, 10), radius: 2 } // Un pilastro al centro
            ],
        };
    });

    // ---------------------------------------------------------
    // TEST PER: isPillarCollision (Circle-to-Circle)
    // ---------------------------------------------------------
    describe('isPillarCollision', () => {
        it('dovrebbe restituire FALSE se l\'entità è lontana dal pilastro', () => {
            const pos = new Vector(0, 0); // Molto lontano da (10, 10)
            const isColliding = physicsSystem.isPillarCollision(pos, 1, mockWorld);
            expect(isColliding).toBe(false);
        });

        it('dovrebbe restituire TRUE se l\'entità si sovrappone al pilastro', () => {
            // Pilastro in 10,10 (raggio 2). Entità in 10,12.5 (raggio 1).
            // Distanza = 2.5. Somma dei raggi = 3. 2.5 < 3 -> COLLISIONE!
            const pos = new Vector(10, 12.5);
            const isColliding = physicsSystem.isPillarCollision(pos, 1, mockWorld);
            expect(isColliding).toBe(true);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: isPlayerCollision (Circle-to-Circle)
    // ---------------------------------------------------------
    describe('isPlayerCollision', () => {
        let targetPlayer: Player;

        beforeEach(() => {
            targetPlayer = {
                entityId: 'player-2',
                position: new Vector(5, 5),
                radius: 1,
                isDead: false,
                isGhost: false,
            } as Player;
            playersMap.set('player-2', targetPlayer);
        });

        it('dovrebbe restituire il giocatore bersaglio se c\'è collisione', () => {
            const moverPos = new Vector(5, 6); // Distanza 1, Somma raggi 2
            const result = physicsSystem.isPlayerCollision('player-1', moverPos, 1, playersMap.values());
            expect(result).toBe(targetPlayer);
        });

        it('dovrebbe ignorare la collisione con se stessi (stesso entityId)', () => {
            const moverPos = new Vector(5, 5); // Esattamente sopra se stesso
            const result = physicsSystem.isPlayerCollision('player-2', moverPos, 1, playersMap.values());
            expect(result).toBeUndefined();
        });

        it('dovrebbe ignorare i giocatori morti', () => {
            targetPlayer.isDead = true;
            const moverPos = new Vector(5, 6);
            const result = physicsSystem.isPlayerCollision('player-1', moverPos, 1, playersMap.values());
            expect(result).toBeUndefined();
        });

        it('dovrebbe ignorare i giocatori "fantasma" (isGhost = true)', () => {
            targetPlayer.isGhost = true;
            const moverPos = new Vector(5, 6);
            const result = physicsSystem.isPlayerCollision('player-1', moverPos, 1, playersMap.values());
            expect(result).toBeUndefined();
        });
    });

    // ---------------------------------------------------------
    // TEST PER: calculatePhysics (Movimento Giocatore)
    // ---------------------------------------------------------
    describe('calculatePhysics (Player)', () => {
        it('dovrebbe far avanzare il giocatore se non ci sono collisioni', () => {
            const player = {
                entityId: 'player-1',
                position: new Vector(0, 0),
                displacement: new Vector(1, 0), // Si muove verso destra (X)
                speed: 10,
                radius: 1,
                isGhost: false,
            } as Player;

            physicsSystem.calculatePhysics(player, playersMap, mockWorld, 1);

            // X = 0 + (1 * 10 * 1) = 10
            expect(player.position.x).toBe(10);
            expect(player.position.z).toBe(0);
        });

        it('dovrebbe far "scivolare" il giocatore se sbatte contro un muro sull\'asse X', () => {
            const player = {
                entityId: 'player-1',
                position: new Vector(0, 0),
                displacement: new Vector(1, 1), // Movimento in diagonale
                speed: 10,
                radius: 1,
                isGhost: false,
            } as Player;

            // Simuliamo che ci sia un muro SOLO sull'asse X
            mockWorld.isWallCollision.mockImplementation((pos: Vector) => {
                return pos.x > 0; // Qualsiasi movimento su X causa collisione
            });

            physicsSystem.calculatePhysics(player, playersMap, mockWorld, 1);

            expect(player.position.x).toBe(0); // Bloccato su X
            expect(player.position.z).toBe(10); // Ma ha "scivolato" ed è avanzato su Z!
        });
    });

    // ---------------------------------------------------------
    // TEST PER: calculateBulletPhysics (Movimento Proiettili)
    // ---------------------------------------------------------
    describe('calculateBulletPhysics', () => {
        let bullet: Bullet;

        beforeEach(() => {
            bullet = {
                ownerId: 'player-1',
                teamId: 1,
                position: new Vector(0, 0),
                displacement: new Vector(1, 0),
                speed: 10,
                radius: 0.5,
                hit: BulletHit.NONE,
                lifeTime: 5,
            } as Bullet;
        });

        it('dovrebbe far avanzare il proiettile e ridurre il lifeTime se non colpisce nulla', () => {
            physicsSystem.calculateBulletPhysics(bullet, playersMap, mockWorld, 1);
            
            expect(bullet.position.x).toBe(10);
            expect(bullet.hit).toBe(BulletHit.NONE);
            expect(bullet.lifeTime).toBe(4); // 5 - 1
        });

        it('dovrebbe distruggersi contro un muro', () => {
            mockWorld.isWallCollision.mockReturnValue(true); // Qualsiasi movimento sbatte contro un muro

            physicsSystem.calculateBulletPhysics(bullet, playersMap, mockWorld, 1);
            
            expect(bullet.hit).toBe(BulletHit.WALL_HIT);
        });

        it('dovrebbe colpire un nemico e registrare l\'entità colpita', () => {
            const enemy = {
                entityId: 'enemy-1',
                teamId: 2, // Team diverso (Nemico)
                position: new Vector(10, 0), // Esattamente dove arriverà il proiettile
                radius: 1,
                isDead: false,
                isGhost: false,
            } as Player;
            playersMap.set('enemy-1', enemy);

            physicsSystem.calculateBulletPhysics(bullet, playersMap, mockWorld, 1);

            expect(bullet.hit).toBe(BulletHit.PLAYER_HIT);
            expect(bullet.entityHit).toBe(enemy);
        });

        it('dovrebbe ignorare il fuoco amico e passare attraverso un compagno di squadra', () => {
            const ally = {
                entityId: 'ally-1',
                teamId: 1, // Stesso team del proiettile
                position: new Vector(10, 0),
                radius: 1,
                isDead: false,
                isGhost: false,
            } as Player;
            playersMap.set('ally-1', ally);

            physicsSystem.calculateBulletPhysics(bullet, playersMap, mockWorld, 1);

            expect(bullet.hit).toBe(BulletHit.NONE); // Non l'ha colpito
            expect(bullet.entityHit).toBeUndefined();
            expect(bullet.position.x).toBe(10); // È passato oltre
        });
    });
});