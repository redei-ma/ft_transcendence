# --- Stage 1: Build (dev mode uses this stage via target: build) ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Stage 2: Production (static files served by nginx) ---
FROM nginx:stable-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing: unknown paths fall back to index.html (React handles routing client-side)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
