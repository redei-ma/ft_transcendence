import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GameController],
  providers: [GameGateway],
})
export class GameModule {}
