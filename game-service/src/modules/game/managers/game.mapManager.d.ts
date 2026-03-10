import { OnModuleInit } from "@nestjs/common";
import { MapData } from "@transcendence/types";
export declare class MapManager implements OnModuleInit {
    logger: any;
    private mapData;
    onModuleInit(): Promise<void>;
    private preloadMap;
    getMap(): MapData | undefined;
}
//# sourceMappingURL=game.mapManager.d.ts.map