import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { SocketEvents } from './game/configs/game.events';

//npm i --save @nestjs/throttler

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
				name: SocketEvents.JOIN_LOBBY,
				ttl: 60000,
				limit: 10,
			},
			{
				name: SocketEvents.GAME_MESSAGE,
				ttl: 60000,
				limit: 5,
			},
			{
				name: SocketEvents.INPUT,
				ttl: 1000,
				limit: 250,
			},
			]),
		],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}