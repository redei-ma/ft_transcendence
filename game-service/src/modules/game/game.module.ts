import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { AuthModule } from '../auth/auth.module';
import { GameGateway } from "./game.gateway";
import { SocketAuthService } from "../auth/socket-auth.service";

@Module({
  imports: [AuthModule],
  controllers: [GameController],
  providers: [GameGateway, SocketAuthService],
})
export class GameModule {}
