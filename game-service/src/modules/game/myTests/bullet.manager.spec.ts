import { BulletManager } from '../managers/bullet.manager';
import { Bullet, Player, BulletHit, AttackType } from '../interfaces-enums';

describe('BulletManager', () => {
    let bulletManager: BulletManager;
    let mockPhysicsSystem: any;
    let mockCombatSystem: any;
    let mockWorld: any;
    let playersMap: Map<string, Player>;

    beforeEach(() => {
        // 1. Mock dei sistemi
        mockPhysicsSystem = {
            calculateBulletPhysics: jest.fn(),
        };

        mockCombatSystem = {
            applyDamage: jest.fn(),
        };

        // 2. Mock del mondo di gioco
        mockWorld = {
            bullets: []
        };

        // 3. Mappa dei giocatori
        playersMap = new Map();

        bulletManager = new BulletManager(mockPhysicsSystem, mockCombatSystem);
    });

    // ---------------------------------------------------------
    // TEST: updateBullets
    // ---------------------------------------------------------
    describe('updateBullets', () => {
        
        it('dovrebbe ignorare completamente i proiettili non attivi', () => {
            const bullet = { isActive: false } as Bullet;
            mockWorld.bullets.push(bullet);

            bulletManager.updateBullets(1, mockWorld, playersMap);

            expect(mockPhysicsSystem.calculateBulletPhysics).not.toHaveBeenCalled();
        });

        it('dovrebbe disattivare il proiettile se il proprietario (attaccante) non esiste più (es. si è disconnesso)', () => {
            const bullet = { isActive: true, ownerId: 'player-1' } as Bullet;
            mockWorld.bullets.push(bullet);
            
            bulletManager.updateBullets(1, mockWorld, playersMap);

            expect(bullet.isActive).toBe(false);
            expect(mockPhysicsSystem.calculateBulletPhysics).not.toHaveBeenCalled();
        });

        it('dovrebbe far avanzare il proiettile mantenendolo attivo se non colpisce nulla e ha tempo residuo', () => {
            const attacker = { entityId: 'player-1' } as Player;
            playersMap.set('player-1', attacker);

            const bullet = { isActive: true, ownerId: 'player-1', hit: BulletHit.NONE, lifeTime: 5 } as Bullet;
            mockWorld.bullets.push(bullet);

            bulletManager.updateBullets(1, mockWorld, playersMap);

            expect(mockPhysicsSystem.calculateBulletPhysics).toHaveBeenCalledWith(bullet, playersMap, mockWorld, 1);
            expect(bullet.isActive).toBe(true);
        });

        it('dovrebbe disattivare il proiettile se il lifeTime scende a zero o meno', () => {
            const attacker = { entityId: 'player-1' } as Player;
            playersMap.set('player-1', attacker);

            const bullet = { isActive: true, ownerId: 'player-1', hit: BulletHit.NONE, lifeTime: 0 } as Bullet;
            mockWorld.bullets.push(bullet);

            bulletManager.updateBullets(1, mockWorld, playersMap);

            // Tempo scaduto, si deve spegnere
            expect(bullet.isActive).toBe(false);
        });

        it('dovrebbe disattivare il proiettile se colpisce un muro', () => {
            const attacker = { entityId: 'player-1' } as Player;
            playersMap.set('player-1', attacker);

            const bullet = { isActive: true, ownerId: 'player-1', hit: BulletHit.NONE, lifeTime: 5 } as Bullet;
            mockWorld.bullets.push(bullet);

            mockPhysicsSystem.calculateBulletPhysics.mockImplementation((b: Bullet) => {
                b.hit = BulletHit.WALL_HIT;
            });

            bulletManager.updateBullets(1, mockWorld, playersMap);

            expect(bullet.isActive).toBe(false);
            expect(mockCombatSystem.applyDamage).not.toHaveBeenCalled(); // Non infligge danni al muro
        });

        it('dovrebbe applicare i danni magici e disattivarsi se colpisce un nemico', () => {
            const attacker = { entityId: 'player-1' } as Player;
            const victim = { entityId: 'player-2' } as Player;
            playersMap.set('player-1', attacker);

            const bullet = { isActive: true, ownerId: 'player-1', hit: BulletHit.NONE, lifeTime: 5 } as Bullet;
            mockWorld.bullets.push(bullet);

            // Simuliamo che la fisica ci dica: "Ha centrato un nemico!"
            mockPhysicsSystem.calculateBulletPhysics.mockImplementation((b: Bullet) => {
                b.hit = BulletHit.PLAYER_HIT;
                b.entityHit = victim;
            });

            bulletManager.updateBullets(1, mockWorld, playersMap);

            // Deve chiamare applyDamage del CombatSystem con il tipo giusto (SPELL_ATTACK)
            expect(mockCombatSystem.applyDamage).toHaveBeenCalledWith(victim, attacker, AttackType.SPELL_ATTACK);
            
            // E poi deve esplodere/disattivarsi
            expect(bullet.isActive).toBe(false);
        });
    });
});