FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Evita o Vite (import-analysis / watch) tratar o próprio Dockerfile ou ficheiros de deploy como módulos JS.
RUN rm -f Dockerfile caddy.txt 2>/dev/null || true

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

