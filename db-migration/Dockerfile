FROM node:20-alpine

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

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

USER appuser

ENTRYPOINT [ "./entrypoint.sh" ]
