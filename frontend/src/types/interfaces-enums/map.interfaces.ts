import { Vector } from "../game.types";

export interface	StaticEntity{
	id: string;
	position: Vector;
	width: number;// Width
	depth: number;// Depth
}

export interface	Pillar{
	id: string;
	position: Vector;
	radius: number;
}

export interface	GameWorld extends StaticEntity{
	walls: StaticEntity[];
	pillars: Pillar[];
}

export interface MapWallData{
	id: string;
	x: number;
	z: number;
	width: number;
	depth: number;
}

export interface MapPillarsData{
	id: string,
	x: number,
	z: number,
	radius: number,
}

export interface MapData{
	meta:{
		name: string;
		version: string;
		author: string;
	}
	settings:{
		width: number;
		depth: number;
		maxPlayers: number;
	}
	walls: MapWallData[];
	pillars: MapPillarsData[];
	spawn_points: {x: number, z: number}[];
}