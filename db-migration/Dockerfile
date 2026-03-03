FROM node:20-alpine

WORKDIR /app


RUN apk add --no-cache openssl


COPY shared/types ./shared/types

WORKDIR /app/db-migration

COPY db-migration/package*.json ./
RUN npm ci --install-links


COPY shared/prisma ./prisma/
RUN npx prisma generate


COPY db-migration/. .
RUN chmod +x entrypoint.sh

ENV PATH="/app/db-migration/node_modules/.bin:$PATH"

ENTRYPOINT [ "./entrypoint.sh" ]