# --- Stage 1: Build (dev mode uses this stage via target: build) ---
FROM node:20-alpine AS build

WORKDIR /app

COPY shared/types ./shared/types

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# --- Stage 2: Production (static files served by nginx unprivileged) ---
FROM nginxinc/nginx-unprivileged:stable-alpine AS production

COPY --from=build /app/frontend/dist /usr/share/nginx/html

# SPA routing: unknown paths fall back to index.html.
RUN printf 'server {\n\
    listen 5173;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
