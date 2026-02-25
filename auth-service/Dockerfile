FROM node:20-alpine

# 1. Build auth-shared
WORKDIR /usr/src/auth-shared
COPY auth-shared/ .
RUN npm install && npm run build

# 2. Build shared/types
WORKDIR /usr/src/shared/types
COPY shared/types/ .
RUN npm install

# 3. Set up auth-service
WORKDIR /usr/src/app
COPY auth-service/package*.json ./
RUN npm install

# 4. Copy source
COPY auth-service/. .

# 5. Inject shared libraries (overwrite symlinks created by npm install)
RUN mkdir -p node_modules/@game && \
    ln -sf /usr/src/auth-shared ./node_modules/@game/auth-shared && \
    mkdir -p node_modules/@transcendence && \
    ln -sf /usr/src/shared/types ./node_modules/@transcendence/types

# 6. Build
RUN npm run build

COPY auth-service/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
