"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MapManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapManager = void 0;
const common_1 = require("@nestjs/common");
const path = require("path");
const fs = require("fs");
let MapManager = MapManager_1 = class MapManager {
    constructor() {
        this.logger = new common_1.Logger(MapManager_1.name);
    }
    async onModuleInit() {
        await this.preloadMap();
    }
    async preloadMap() {
        try {
            const mapPath = path.join(process.cwd(), 'src/assets/maps/classic.json');
            this.logger.log(`Loading map from: ${mapPath}`);
            const mapFile = await fs.promises.readFile(mapPath, 'utf-8');
            this.mapData = JSON.parse(mapFile);
            this.logger.log('Map loaded successfully');
        }
        catch (error) {
            this.logger.error(`CRITICAL: Error in loading the map from disk: ${error.message}`);
        }
    }
    getMap() {
        if (!this.mapData) {
            this.logger.error("getMap called but mapData is undefined (Map load failed previously)");
            return undefined;
        }
        return this.mapData;
    }
};
exports.MapManager = MapManager;
exports.MapManager = MapManager = MapManager_1 = __decorate([
    (0, common_1.Injectable)()
], MapManager);
