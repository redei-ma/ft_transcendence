FROM node:20.20.2-alpine3.23

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

RUN apk add --no-cache openssl

WORKDIR /app/shared
COPY shared/prisma ./prisma

WORKDIR /app/shared/types
COPY shared/types/ .
RUN --mount=type=cache,target=/root/.npm npm install && npm run build

WORKDIR /app/db-migration
COPY db-migration/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --install-links

RUN npx prisma generate --schema=../shared/prisma/schema.prisma

COPY db-migration/. .
RUN chmod +x entrypoint.sh

ENV PATH="/app/db-migration/node_modules/.bin:$PATH"

USER appuser

ENTRYPOINT [ "./entrypoint.sh" ]
