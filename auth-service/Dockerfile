# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app/auth-shared

COPY auth-shared/ .

RUN npm install && npm run build

WORKDIR /app

COPY shared/types/ ./shared/types

WORKDIR /app/auth-service

COPY auth-service/package*.json ./

RUN npm ci --install-links

COPY auth-service/. .


RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app/auth-service

# Copy built artifacts and modules from the builder stage
COPY --from=build /app/auth-service/dist ./dist
COPY --from=build /app/auth-service/node_modules ./node_modules
COPY --from=build /app/auth-service/package*.json ./

EXPOSE 3002

CMD ["node", "dist/main"]