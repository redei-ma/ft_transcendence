# --- Stage 1: Build ---
FROM node:20-alpine AS build

# Build shared auth package
WORKDIR /app/shared/auth
COPY shared/auth/ .
RUN npm install && npm run build

WORKDIR /app
COPY shared/types/ ./shared/types

# Install service dependencies (--install-links copies file: deps into node_modules)
WORKDIR /app/auth-service
COPY auth-service/package*.json ./
RUN npm install --install-links
COPY auth-service/. .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app/auth-service

COPY --from=build /app/auth-service/dist ./dist
COPY --from=build /app/auth-service/node_modules ./node_modules
COPY --from=build /app/auth-service/package*.json ./

USER appuser
EXPOSE 3002

CMD ["node", "dist/main"]
