import { CombatSystem } from '../systems/game.combatSystem';
import { Vector } from '../utils/game.vector';
import { Player, AttackType, CharacterName } from '../interfaces-enums';
import { GameConfig } from '../configs/game.config';
import { CHARACTER_DATA } from '../factories/player.factory'; // Assicurati che il path sia giusto

describe('CombatSystem', () => {
    let combatSystem: CombatSystem;
    let mockWorld: any;
    let attacker: Player;
    let victim: Player;

    beforeEach(() => {
        combatSystem = new CombatSystem();

        mockWorld = {
            spawnBullet: jest.fn()
        };

        attacker = {
            entityId: 'player-1',
            characterName: CharacterName.ZEUS,
            teamId: 1,
            position: new Vector(0, 0),
            rotation: 0,
            hp: 100,
            meleeAttackDamage: 20,
            spellAttackDamage: 40,
            meleeAttackHitboxRadius: 2,
            spellAttackspeed: 10,
            spellAttackHitboxRadius: 1,
            damage: 0,
            kill: 0,
            attackType: AttackType.MELEE_ATTACK,
            clutchMasterAchievement: false,
            spellAttackCooldown: 0,
            meleeAttackCooldown: 0,
            defenceAttackCooldown: 0,
        } as Player;

        victim = {
            entityId: 'player-2',
            teamId: 2, // Team nemico
            position: new Vector(2, 0),
            radius: 1,
            hp: 100,
            isDefending: false,
            isDead: false,
            isGhost: false,
            deads: 0,
        } as Player;
    });

    // ---------------------------------------------------------
    // TEST PER: applyDamage (Danni, Kill e Achievement)
    // ---------------------------------------------------------
    describe('applyDamage', () => {
        it('dovrebbe applicare il danno melee e aggiornare le statistiche', () => {
            combatSystem.applyDamage(victim, attacker, AttackType.MELEE_ATTACK);

            expect(victim.hp).toBe(80); // 100 - 20
            expect(attacker.damage).toBe(20);
        });

        it('dovrebbe applicare il danno magico e aggiornare le statistiche', () => {
            combatSystem.applyDamage(victim, attacker, AttackType.SPELL_ATTACK);

            expect(victim.hp).toBe(60); // 100 - 40
            expect(attacker.damage).toBe(40);
        });

        it('NON dovrebbe infliggere danni se la vittima si sta difendendo', () => {
            victim.isDefending = true;
            combatSystem.applyDamage(victim, attacker, AttackType.MELEE_ATTACK);

            expect(victim.hp).toBe(100);
            expect(attacker.damage).toBe(0);
        });

        it('NON dovrebbe infliggere danni ai compagni di squadra (Fuoco Amico)', () => {
            victim.teamId = 1; // Stesso team dell'attaccante
            combatSystem.applyDamage(victim, attacker, AttackType.SPELL_ATTACK);

            expect(victim.hp).toBe(100);
        });

        it('dovrebbe uccidere la vittima e assegnare la kill se gli HP scendono a 0', () => {
            victim.hp = 10;
            combatSystem.applyDamage(victim, attacker, AttackType.MELEE_ATTACK);

            expect(victim.hp).toBe(-10);
            expect(victim.isDead).toBe(true);
            expect(victim.isGhost).toBe(true);
            expect(victim.deads).toBe(1);
            expect(attacker.kill).toBe(1);
        });

        it('dovrebbe sbloccare l\'achievement ClutchMaster se l\'attaccante fa una kill con poca vita', () => {
            victim.hp = 10;
            const clutchThreshold = GameConfig.PLAYER.DEFAULT_HP * GameConfig.ACHIEVEMENT.CLUTCHMASTER;
            attacker.hp = clutchThreshold; 

            combatSystem.applyDamage(victim, attacker, AttackType.MELEE_ATTACK);

            expect(victim.isDead).toBe(true);
            expect(attacker.clutchMasterAchievement).toBe(true);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handleMeleeAttack e isTargetInHitbox
    // ---------------------------------------------------------
    describe('handleMeleeAttack', () => {
        it('dovrebbe colpire i nemici nel raggio d\'azione', () => {
            const playersMap = new Map<string, Player>();
            playersMap.set(attacker.entityId, attacker);
            playersMap.set(victim.entityId, victim);

            combatSystem.handleMeleeAttack(attacker, playersMap);

            expect(victim.hp).toBe(80); // Colpito!
        });

        it('NON dovrebbe colpire se stesso', () => {
            const playersMap = new Map<string, Player>();
            playersMap.set(attacker.entityId, attacker);

            combatSystem.handleMeleeAttack(attacker, playersMap);

            expect(attacker.hp).toBe(100); // Intatto
        });

        it('NON dovrebbe colpire nemici troppo lontani', () => {
            victim.position.set(10, 10);
            const playersMap = new Map<string, Player>();
            playersMap.set(attacker.entityId, attacker);
            playersMap.set(victim.entityId, victim);

            combatSystem.handleMeleeAttack(attacker, playersMap);

            expect(victim.hp).toBe(100); // Intatto
        });
    });

    // ---------------------------------------------------------
    // TEST PER: handleSpellAttack
    // ---------------------------------------------------------
    describe('handleSpellAttack', () => {
        it('dovrebbe calcolare lo sparo e far spawnare il proiettile nel mondo', () => {
            combatSystem.handleSpellAttack(attacker, mockWorld);

            // Verifichiamo che il metodo spawnBullet sia stato chiamato con i parametri corretti
            expect(mockWorld.spawnBullet).toHaveBeenCalledWith(
                'player-1', // ownerId
                CharacterName.ZEUS,
                1, // teamId
                expect.any(Vector), // La posizione calcolata dinamicamente
                expect.any(Vector), // Il displacement calcolato dinamicamente
                10, // spellAttackspeed
                1 // spellAttackHitboxRadius
            );
        });
    });

    // ---------------------------------------------------------
    // TEST PER: updateCooldowns
    // ---------------------------------------------------------
    describe('updateCooldowns', () => {
        it('dovrebbe incrementare i cooldown limitandoli al valore massimo del personaggio', () => {
            const stats = CHARACTER_DATA[CharacterName.ZEUS];
            const dt = 1.0; // Simuliamo che sia passato 1 secondo
            
            // Azzeriamo i cooldown per il test
            attacker.spellAttackCooldown = 0;
            
            combatSystem.updateCooldowns(attacker, dt);

            // Il cooldown deve essere aumentato di 1
            expect(attacker.spellAttackCooldown).toBe(1.0);
        });

        it('NON dovrebbe incrementare i cooldown se sono già al massimo', () => {
            const stats = CHARACTER_DATA[CharacterName.ZEUS];
            const dt = 1.0;
            
            // Impostiamo il cooldown già al limite massimo consentito per Zeus
            attacker.spellAttackCooldown = stats.COOLDOWN_SPELL_ATTACK;
            
            combatSystem.updateCooldowns(attacker, dt);

            // Non deve essere aumentato ulteriormente!
            expect(attacker.spellAttackCooldown).toBe(stats.COOLDOWN_SPELL_ATTACK);
        });
    });
});