FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Production: Nginx for local, serve for Railway ---
FROM nginx:alpine AS nginx
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost:80/ || exit 1

FROM node:22-alpine AS serve
RUN npm install -g serve@latest
COPY --from=builder /app/dist /app/dist
EXPOSE 3000
CMD ["serve", "-s", "/app/dist", "-l", "3000"]
