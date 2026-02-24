# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy shared types and Prisma schema
COPY shared/types ./shared/types
COPY shared/prisma/schema.prisma ./shared/prisma/schema.prisma

# Build shared/types
RUN cd shared/types && npm install && npm run build

# Set working directory
WORKDIR /app/user-service

# Copy dependency files
COPY user-service/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY user-service/. .

# Generate Prisma Client and build the application
RUN npx prisma generate --schema=../shared/prisma/schema.prisma
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app/user-service

# Copy built artifacts and modules from the builder stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main"]