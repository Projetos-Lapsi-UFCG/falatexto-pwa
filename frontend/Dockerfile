# Stage 1: build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Stage 2: serve
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/falatexto-pwa/browser /usr/share/nginx/html

# Injeta /config.js a partir das variáveis de ambiente antes do nginx iniciar.
# O entrypoint da imagem nginx executa os scripts de /docker-entrypoint.d/ em ordem.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-generate-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-generate-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
