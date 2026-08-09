import { World } from "../../game.world";
import { Vector, GameConfig } from '@transcendence/types'

export interface PathNode{
    gridX: number;
    gridZ: number;

    distanceTravelled: number;
    estimatedDistance: number;

    parentNode?: PathNode;

}

export class PathFinder{

    static findPath(startPos: Vector, targetPos: Vector, gameWorld: World): Vector[]{
        let openList: PathNode[] = [];
        let closedList: Map<string, PathNode> = new Map();

        const startX: number = Math.floor(startPos.x / GameConfig.MAP.CELL_SIZE);
        const startZ: number = Math.floor(startPos.z / GameConfig.MAP.CELL_SIZE);

        const targetX: number = Math.floor(targetPos.x / GameConfig.MAP.CELL_SIZE);
        const targetZ: number = Math.floor(targetPos.z / GameConfig.MAP.CELL_SIZE);

        if (targetX < 0 || targetX >= gameWorld.gridWidth ||
            targetZ < 0 || targetZ >= gameWorld.gridDepth) return ([]);

        let estimatedDistance: number = PathFinder.getEstimatedDistance(targetX, targetZ, startX, startZ);
        const firstNode: PathNode = PathFinder.getNewPathNode(startX, startZ, 0, estimatedDistance, undefined);

        openList.push(firstNode);

        let currentNode: PathNode | undefined = undefined;
        while (openList.length > 0){
            let bestCost: number = Infinity;
            let bestIndex = Infinity;

            //i get the best node, calculating the best cost => distanceTravelled + estimatedDistance
            // i save the index for remove the node from the open list, since i have already check that node
            for (let i = 0; i < openList.length; i++){
                const currentCost: number = PathFinder.getCost(openList[i].distanceTravelled, openList[i].estimatedDistance);
                if (currentCost < bestCost){
                    bestCost = currentCost;
                    bestIndex = i;
                }
            }

            if (bestIndex === Infinity || bestIndex > openList.length) return ([]);
            currentNode = openList[bestIndex];
            openList.splice(bestIndex, 1);

            const currentNodeKey: string = String(currentNode.gridX + "," + currentNode.gridZ)
            closedList.set(currentNodeKey ,currentNode);

            if (currentNode.gridX === targetX && currentNode.gridZ === targetZ){
                let finalPath: Vector[] = PathFinder.getFinalPath(currentNode);
                return finalPath;
            }

            this.findNewDirection(currentNode, openList, closedList, gameWorld, targetX, targetZ);
        }
        return ([]);
    }

	static findNewDirection(currentNode: PathNode, openList: PathNode[],
		closedList: Map<string, PathNode>, gameWorld: World, targetX: number, targetZ: number){
		
		const directions = [
            {dx: 0, dz: -1},
            {dx: -1, dz: 0},
            {dx: 1, dz: 0},
            {dx: 0, dz: 1},
            {dx: 1, dz: 1},
            {dx: -1, dz: -1},
            {dx: -1, dz: 1},
            {dx: 1, dz: -1},
        ]

        for (const direction of directions){
            let neighborX: number = currentNode.gridX + direction.dx;
            let neighborZ: number = currentNode.gridZ + direction.dz;
            if (neighborX < 0 || neighborX >= gameWorld.gridWidth ||
                neighborZ < 0 || neighborZ >= gameWorld.gridDepth) continue;

            let index = neighborX + (neighborZ * gameWorld.gridWidth);
            if (gameWorld.grid[index] === 1) continue;

            let neighborKey: string = String(neighborX + ',' + neighborZ);
            if (closedList.has(neighborKey)) continue;

            const isDiagonal: boolean = direction.dx !== 0 && direction.dz !== 0;
            if (isDiagonal) {
                const index1 = (currentNode.gridX + direction.dx) + (currentNode.gridZ * gameWorld.gridWidth);
                const index2 = currentNode.gridX + ((currentNode.gridZ + direction.dz) * gameWorld.gridWidth);
                
                if (gameWorld.grid[index1] === 1 || gameWorld.grid[index2] === 1) {
                    continue; 
                }
            }
            let stepCost: number = isDiagonal ? 1.414 : 1;
            let newDistanceTravelled: number = currentNode.distanceTravelled + stepCost;
            let newEstimatedDistance: number = PathFinder.getEstimatedDistance(targetX, targetZ, neighborX, neighborZ);
            let cost = PathFinder.getCost(newDistanceTravelled, newEstimatedDistance);
            let existingNode: PathNode | undefined = openList.find(node => node.gridX === neighborX && node.gridZ === neighborZ)
            if (!existingNode){
                const newNode: PathNode = PathFinder.getNewPathNode(neighborX, neighborZ, newDistanceTravelled, newEstimatedDistance, currentNode);
                openList.push(newNode);
            }
            else{
                if (PathFinder.getCost(existingNode.distanceTravelled, existingNode.estimatedDistance) > cost){
                    existingNode.parentNode = currentNode;
                    existingNode.distanceTravelled = newDistanceTravelled;
                    existingNode.estimatedDistance = newEstimatedDistance;
                }                   
            }
        }
	}

    static getEstimatedDistance(targetX: number, targetZ: number, startX: number, startZ: number): number{
        //Octile Distance
        const dx = Math.abs(targetX - startX);
        const dz = Math.abs(targetZ - startZ);
        return (Math.max(dx, dz) + 0.414 * Math.min(dx, dz));
    }

    static getFinalPath(currentNode: PathNode){
        let finalPath: Vector[] = [];

        let traceNode: PathNode = currentNode;
        while (traceNode){
            if (!traceNode.parentNode){
                break;
            }
            
            finalPath.push(PathFinder.getVectorFromGrid(traceNode.gridX, traceNode.gridZ));
            traceNode = traceNode.parentNode;
        }
        finalPath.reverse();
        return (finalPath);
    }

    static getCost(distanceTravelled: number, estimatedDistance: number){
        return (distanceTravelled + estimatedDistance);
    }
    
    static getVectorFromGrid(gridX: number, gridZ: number): Vector{
        const offset = GameConfig.MAP.CELL_SIZE / 2;
        const x = gridX * GameConfig.MAP.CELL_SIZE + offset;
        const z = gridZ * GameConfig.MAP.CELL_SIZE + offset;
    
        let resultVector: Vector = new Vector(x, z);
    
        return (resultVector)
    }
    
    static getNewPathNode(gridX: number, gridZ: number, distanceTravelled: number,
        estimatedDistance: number, parentNode: PathNode | undefined): PathNode{
        
        return {
            gridX: gridX,
            gridZ: gridZ,
            distanceTravelled: distanceTravelled,
            estimatedDistance: estimatedDistance,
            parentNode: parentNode,
        }
    }
} 