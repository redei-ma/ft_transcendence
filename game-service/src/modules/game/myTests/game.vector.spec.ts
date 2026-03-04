import { Vector } from '../utils/game.vector';

describe('Vector', () => {
    
    // ---------------------------------------------------------
    // TEST PER: Creazione del vettore
    // ---------------------------------------------------------
    describe('Costruttore e fromData', () => {
        it('dovrebbe creare un vettore con i valori x e z corretti tramite il costruttore', () => {
            const v = new Vector(5, 10);
            expect(v.x).toBe(5);
            expect(v.z).toBe(10);
        });

        it('dovrebbe creare un vettore usando il metodo statico fromData', () => {
            const data = { x: 3, z: -4 };
            const v = Vector.fromData(data);
            expect(v.x).toBe(3);
            expect(v.z).toBe(-4);
            expect(v instanceof Vector).toBe(true);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: set
    // ---------------------------------------------------------
    describe('set', () => {
        it('dovrebbe aggiornare correttamente i valori x e z', () => {
            const v = new Vector(0, 0);
            v.set(7, 8);
            expect(v.x).toBe(7);
            expect(v.z).toBe(8);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: getRotation
    // ---------------------------------------------------------
    describe('getRotation', () => {
        it('dovrebbe calcolare la rotazione corretta in radianti (0 gradi)', () => {
            const vRight = new Vector(1, 0);
            expect(vRight.getRotation()).toBe(0);
        });

        it('dovrebbe calcolare la rotazione corretta in radianti (90 gradi)', () => {
            const vUp = new Vector(0, 1);
            expect(vUp.getRotation()).toBe(Math.PI / 2);
        });

        it('dovrebbe calcolare la rotazione corretta in radianti (180 gradi)', () => {
            const vLeft = new Vector(-1, 0);
            expect(vLeft.getRotation()).toBe(Math.PI);
        });

        it('dovrebbe calcolare la rotazione corretta in radianti (-90 gradi)', () => {
            const vDown = new Vector(0, -1);
            expect(vDown.getRotation()).toBe(-Math.PI / 2);
        });
    });

    // ---------------------------------------------------------
    // TEST PER: normalize
    // ---------------------------------------------------------
    describe('normalize', () => {
        it('NON dovrebbe modificare il vettore se la lunghezza è minore di 1', () => {
            const v = new Vector(0.5, 0.5);
            v.normalize();
            expect(v.x).toBe(0.5);
            expect(v.z).toBe(0.5);
        });

        it('NON dovrebbe modificare il vettore se la lunghezza è esattamente 1', () => {
            const v = new Vector(1, 0);
            v.normalize();
            expect(v.x).toBe(1);
            expect(v.z).toBe(0);
        });

        it('dovrebbe "tagliare" il vettore se la lunghezza è maggiore di 1 (es. movimento in diagonale)', () => {
            // Un vettore (1, 1) ha una lunghezza di Math.sqrt(2) ovvero ~1.41
            const v = new Vector(1, 1);
            v.normalize();
            
            // Il valore corretto dopo il normalize deve essere 1 / sqrt(2) ~ 0.7071
            const expectedValue = 1 / Math.sqrt(2);
            
            // Nota: Usiamo toBeCloseTo invece di toBe perché in Javascript 
            // i numeri con la virgola possono avere minuscoli errori di precisione
            expect(v.x).toBeCloseTo(expectedValue);
            expect(v.z).toBeCloseTo(expectedValue);
        });

        it('dovrebbe "tagliare" un vettore enorme a lunghezza 1', () => {
            const v = new Vector(10, 0);
            v.normalize();
            expect(v.x).toBe(1);
            expect(v.z).toBe(0);
        });
    });
});