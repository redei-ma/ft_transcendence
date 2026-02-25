# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app


RUN apk add --no-cache openssl


COPY shared/types ./shared/types

COPY shared/prisma/schema.prisma ./prisma/schema.prisma


WORKDIR /app/user-service


COPY user-service/package*.json ./


RUN npm ci --install-links


COPY user-service/. .


RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app/user-service

# Copy built artifacts and modules from the builder stage
COPY --from=build /app/user-service/node_modules ./node_modules
COPY --from=build /app/user-service/package*.json ./
COPY --from=build /app/user-service/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main"]