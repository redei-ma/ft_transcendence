// src/modules/prisma/prisma.module.ts

import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * @Global decorator makes PrismaService available throughout the entire app
 * without needing to import PrismaModule in every module.
 */
@Global()
@Module({
	providers: [PrismaService],
	exports: [PrismaService], // Export to make it available for injection
})
export class PrismaModule {}
