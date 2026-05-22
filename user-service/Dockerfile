# --- Stage 1: Build ---
FROM node:20.20.2-alpine3.23 AS build

WORKDIR /app
RUN apk add --no-cache openssl

WORKDIR /app/shared/auth
COPY shared/auth/ .
RUN npm install && npm run build

WORKDIR /app/shared
COPY shared/prisma/schema.prisma ./prisma/schema.prisma

WORKDIR /app/shared/types
COPY shared/types/ .
RUN npm install && npm run build

WORKDIR /app/shared/dto
COPY shared/dto/ .
RUN npm install && npm run build


WORKDIR /app/user-service
COPY user-service/package*.json ./
RUN npm install --install-links
COPY user-service/. .
RUN npx prisma generate --schema=../shared/prisma/schema.prisma && npm run build

# --- Stage 2: Production ---
FROM node:20.20.2-alpine3.23 AS production

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app/user-service

COPY --from=build /app/user-service/node_modules ./node_modules
COPY --from=build /app/user-service/package*.json ./
COPY --from=build /app/user-service/dist ./dist
COPY --from=build /app/shared/prisma ./shared/prisma

USER appuser
EXPOSE 3001

CMD ["node", "dist/main"]
