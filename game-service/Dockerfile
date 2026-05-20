# --- Stage 1: Build ---
FROM node:20.20.2-alpine3.23 AS build

WORKDIR /app
RUN apk add --no-cache openssl

WORKDIR /app/shared/auth
COPY shared/auth/ .
RUN --mount=type=cache,target=/root/.npm npm install && npm run build

WORKDIR /app/shared
COPY shared/prisma/schema.prisma ./prisma/schema.prisma

WORKDIR /app/shared/types
COPY shared/types/ .
RUN --mount=type=cache,target=/root/.npm npm install && npm run build

# socket.io-msgpack-parser da aggiungere quando metteremo il msg-serializer
WORKDIR /app/game-service
COPY game-service/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --install-links
COPY game-service/. .
RUN npx prisma generate --schema=../shared/prisma/schema.prisma && npm run build

# --- Stage 2: Production ---
FROM node:20.20.2-alpine3.23 AS production

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app/game-service

COPY --from=build /app/game-service/node_modules ./node_modules
COPY --from=build /app/game-service/package*.json ./
COPY --from=build /app/game-service/dist ./dist
COPY --from=build /app/shared/prisma ./shared/prisma

USER appuser
EXPOSE 3000

CMD ["node", "dist/main"]
