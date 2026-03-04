# Usiamo la stessa versione di Node del tuo amico per coerenza
FROM node:latest

# Cartella di lavoro all'interno del container
WORKDIR /usr/src/app

# Copiamo i file dei pacchetti per installare le dipendenze
COPY package*.json ./

# Installiamo le dipendenze base
RUN npm install

# Installiamo i pacchetti specifici per il TUO Matchmaking (Redis e Microservizi)
RUN npm install @nestjs/microservices \
    ioredis \
    @nestjs-modules/ioredis \
    class-validator \
    class-transformer

# Copiamo tutto il resto del tuo codice nel container
COPY . .

# Esponiamo la porta 3000 (o quella che usi per il controller)
EXPOSE 3000

# Avviamo l'applicazione in modalità sviluppo per vedere i log in tempo reale
CMD ["npm", "run", "start:dev"]