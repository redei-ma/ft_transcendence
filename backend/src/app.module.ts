import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { SocketEvents } from './game/configs/game.events';
import { ConfigModule} from '@nestjs/config'

@Module({
	imports: [
		GameModule,
		ScheduleModule.forRoot(),
		ThrottlerModule.forRoot([
			{
				name: 'default',
				ttl: 60000,
				limit: 10,
			},
			{
				name: SocketEvents.GAME_MESSAGE,
				ttl: 60000,
				limit: 5,
			},
			]),
		ConfigModule.forRoot({isGlobal: true})
		],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}