import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as path from "path";
import * as fs from 'fs';import { MapData } from "../game-interfaces";

@Injectable()
export class MapManager implements OnModuleInit{

	logger = new Logger(MapManager.name);
	private mapData: MapData;
		
	async onModuleInit(){
		await this.preloadMap();
	}
		
	private async preloadMap(): Promise<void>{
		try {
			const mapPath = path.join(process.cwd(), 'src/assets/maps/classic.json');

			this.logger.log(`Loading map from: ${mapPath}`);

			const mapFile = await fs.promises.readFile(mapPath, 'utf-8');
			this.mapData = JSON.parse(mapFile);
			this.logger.log('Map loaded successfully');
		}
		catch(error){
			this.logger.error(`CRITICAL: Error in loading the map from disk: ${error.message}`);
		}
	}

	getMap(): MapData | undefined{
		if (!this.mapData){
			this.logger.error("getMap called but mapData is undefined (Map load failed previously)");
			return undefined;
		}
		return this.mapData;
	}
}