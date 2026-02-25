FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy dependency files and install dependencies
COPY db-migration/package*.json ./
RUN npm ci

# Generate Prisma client
COPY shared/prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY db-migration/. .
RUN chmod +x entrypoint.sh

ENV PATH="/app/node_modules/.bin:$PATH"

ENTRYPOINT [ "./entrypoint.sh" ]