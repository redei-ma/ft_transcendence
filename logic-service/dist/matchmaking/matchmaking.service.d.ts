import { JoinQueueDto } from './dto/join-queue.dto';
import Redis from 'ioredis';
export declare class MatchmakingService {
    private readonly redis;
    constructor(redis: Redis);
    processQueue(player: JoinQueueDto): Promise<{
        status: string;
        matchId: string;
        players: string[];
    } | {
        status: string;
        matchId?: undefined;
        players?: undefined;
    }>;
}
