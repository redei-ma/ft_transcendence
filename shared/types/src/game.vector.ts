export class Vector{

	static fromData(data: {x: number, z: number}): Vector{
		return (new Vector(data.x, data.z));
	}

	constructor(public x: number, public z: number) {}

	getRotation(): number{
		return (Math.atan2(this.z, this.x));
	}

	normalize(): void{
		const distance = Math.sqrt(this.x * this.x + this.z * this.z);
		if (distance > 1)
		{
			this.x /= distance;
			this.z /= distance;
		}
	}

	set(newX: number, newZ: number): void{
		this.x = newX;
		this.z = newZ;
	}

	lengthSq(): number{
		return ((this.x * this.x) + (this.z * this.z));
	}
}