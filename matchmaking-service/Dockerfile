# --- Stage 1: Build ---
FROM node:20.20.2-alpine3.23 AS build

WORKDIR /app/shared/auth
COPY shared/auth/ .
RUN npm install && npm run build

WORKDIR /app/shared
COPY shared/prisma/schema.prisma ./prisma/schema.prisma

WORKDIR /app/shared/types
COPY shared/types/ .
RUN npm install && npm run build

WORKDIR /app/matchmaking-service
COPY matchmaking-service/package*.json ./
RUN npm install --install-links
COPY matchmaking-service/. .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20.20.2-alpine3.23 AS production

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app/matchmaking-service

COPY --from=build /app/matchmaking-service/node_modules ./node_modules
COPY --from=build /app/matchmaking-service/package*.json ./
COPY --from=build /app/matchmaking-service/dist ./dist

USER appuser
EXPOSE 3500

CMD ["node", "dist/main"]
