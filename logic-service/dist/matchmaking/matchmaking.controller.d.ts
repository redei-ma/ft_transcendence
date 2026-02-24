import { MatchmakingService } from './matchmaking.service';
import { JoinQueueDto } from './dto/join-queue.dto';
export declare class MatchmakingController {
    private readonly matchmakingService;
    constructor(matchmakingService: MatchmakingService);
    handleJoinQueue(data: JoinQueueDto): Promise<{
        status: string;
        matchId: string;
        players: string[];
    } | {
        status: string;
        matchId?: undefined;
        players?: undefined;
    }>;
}
