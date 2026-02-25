FROM node:latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN npm install @nestjs/websockets \
	@nestjs/platform-socket.io \
	@nestjs/schedule socket.io \
	class-validator \
	class-transformer \
	ioredis \
	@nestjs/microservices \
	@nestjs/config \
	@nestjs/throttler \
	@types/node

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]