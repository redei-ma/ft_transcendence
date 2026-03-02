# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /usr/src/auth-shared
COPY auth-shared/ .
RUN npm install && npm run build

WORKDIR /app

RUN apk add --no-cache openssl

COPY shared/prisma/schema.prisma ./prisma/schema.prisma

WORKDIR /app/game-service

COPY game-service/package*.json ./

RUN npm install

COPY game-service/. .

# Inject the shared library using a symbolic link (Force it with -sf)
RUN mkdir -p node_modules/@game && \
    ln -sf /usr/src/auth-shared ./node_modules/@game/auth-shared

RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app/game-service

# Copy built artifacts and modules from the builder stage
COPY --from=build /app/game-service/node_modules ./node_modules
COPY --from=build /app/game-service/package*.json ./
COPY --from=build /app/game-service/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main"]
