# --- Stage 1: Build ---
FROM node:20-alpine AS build

# Build shared auth package
WORKDIR /app/shared/auth
COPY shared/auth/ .
RUN npm install && npm run build

WORKDIR /app
RUN apk add --no-cache openssl

COPY shared/types ./shared/types
COPY shared/prisma/schema.prisma ./prisma/schema.prisma

# Install service dependencies (--install-links copies file: deps into node_modules)
WORKDIR /app/user-service
COPY user-service/package*.json ./
RUN npm install --install-links
COPY user-service/. .

RUN npx prisma generate --schema=../prisma/schema.prisma && npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app/user-service

COPY --from=build /app/user-service/node_modules ./node_modules
COPY --from=build /app/user-service/package*.json ./
COPY --from=build /app/user-service/dist ./dist
COPY --from=build /app/prisma ./prisma

USER appuser
EXPOSE 3001

CMD ["node", "dist/main"]
