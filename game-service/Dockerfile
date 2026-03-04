# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app/shared/auth
COPY shared/auth/ .
RUN npm install && npm run build

WORKDIR /app
RUN apk add --no-cache openssl

COPY shared/prisma/schema.prisma ./prisma/schema.prisma

WORKDIR /app/game-service
COPY game-service/package*.json ./
RUN npm install

COPY game-service/. .

RUN mkdir -p node_modules/@transcendence && \
    ln -sf /app/shared/auth ./node_modules/@transcendence/auth

RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app/game-service

COPY --from=build /app/game-service/node_modules ./node_modules
COPY --from=build /app/game-service/package*.json ./
COPY --from=build /app/game-service/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main"]
