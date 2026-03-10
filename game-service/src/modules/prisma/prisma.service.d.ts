import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
/**
 * PrismaService extends PrismaClient and implements NestJS lifecycle hooks.
 * - OnModuleInit: Connects to database when module initializes
 * - OnModuleDestroy: Disconnects when application shuts down (graceful shutdown)
 */
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    constructor();
    /**
     * Connect to database when the module is initialized
     */
    onModuleInit(): Promise<void>;
    /**
     * Gracefully disconnect from database when the app shuts down
     */
    onModuleDestroy(): Promise<void>;
}
//# sourceMappingURL=prisma.service.d.ts.map