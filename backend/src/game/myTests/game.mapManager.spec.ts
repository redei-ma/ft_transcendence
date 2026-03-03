import { MapManager } from '../managers/game.mapManager';
import * as fs from 'fs';

describe('MapManager', () => {
    let mapManager: MapManager;

    beforeEach(() => {
        mapManager = new MapManager();

        jest.spyOn(mapManager['logger'], 'log').mockImplementation(() => {});
        jest.spyOn(mapManager['logger'], 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ---------------------------------------------------------
    // TEST: PreloadMap (successo ed errore)
    // ---------------------------------------------------------
    describe('onModuleInit e preloadMap', () => {
        it('dovrebbe caricare e parsare correttamente la mappa dal disco', async () => {
            const fakeMapData = {
                meta: { name: 'test-map', version: '1.0' },
                settings: { width: 100, depth: 100 }
            };
            
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(JSON.stringify(fakeMapData));

            await mapManager.onModuleInit();

            const loadedMap = mapManager.getMap();
            expect(loadedMap).toBeDefined();
            expect(loadedMap?.meta.name).toBe('test-map');
            
            expect(fs.promises.readFile).toHaveBeenCalled();
            expect(mapManager['logger'].log).toHaveBeenCalledWith('Map loaded successfully');
        });

        it('dovrebbe gestire l\'errore se il file non esiste (o il JSON è rotto) senza far crashare il server', async () => {
            jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('ENOENT: no such file or directory'));

            await mapManager.onModuleInit();

            const loadedMap = mapManager.getMap();
            expect(loadedMap).toBeUndefined();
            
            expect(mapManager['logger'].error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL: Error in loading the map'));
        });
    });

    // ---------------------------------------------------------
    // TEST: getMap
    // ---------------------------------------------------------
    describe('getMap', () => {
        it('dovrebbe restituire undefined e loggare un errore se chiamato prima che la mappa sia caricata', () => {
            
            const loadedMap = mapManager.getMap();
            
            expect(loadedMap).toBeUndefined();
            expect(mapManager['logger'].error).toHaveBeenCalledWith(
                "getMap called but mapData is undefined (Map load failed previously)"
            );
        });
    });
});