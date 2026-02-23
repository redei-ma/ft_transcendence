FROM node:20-alpine

# 1. Build the shared library first
WORKDIR /usr/src/auth-shared
COPY auth-shared/ .
RUN npm install && npm run build

# 2. Set up the main app
WORKDIR /usr/src/app

# 3. Copy package files and install
COPY auth-service/package*.json ./
RUN npm install

# 4. Generate Prisma
COPY auth-service/prisma ./prisma
RUN npx prisma generate

# 5. Copy the rest of the source
COPY auth-service/. .

# 6. MANUALLY INJECT THE SHARED LIBRARY
# Instead of copying the whole folder, we link to the one we just built
# Force the link to overwrite whatever npm install put there
RUN mkdir -p node_modules/@game && \
    ln -sf /usr/src/auth-shared ./node_modules/@game/auth-shared

# 7. Build and finalize
RUN npm run build

COPY auth-service/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
