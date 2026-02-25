# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy prebuilt shared types and Prisma schema
COPY shared/types ./shared/types
COPY shared/prisma/schema.prisma ./prisma/schema.prisma

# Set working directory
WORKDIR /app/user-service

# Copy dependency files
COPY user-service/package*.json ./

# Install dependencies
RUN npm install --install-links

# Copy source code
COPY user-service/. .

# Generate Prisma Client and build the application
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