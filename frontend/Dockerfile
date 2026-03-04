FROM node:latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN npm install three @react-three/fiber \
	@react-three/drei \
	socket.io-client \
	@react-three/postprocessing

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]