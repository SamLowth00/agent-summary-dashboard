# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/api/Dockerfile .

FROM node:20-slim AS builder
ENV NX_DAEMON=false
WORKDIR /app

# Toolchain for the sqlite3 native module.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/webapp/package.json apps/webapp/package.json
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx nx build api
RUN npm prune --omit=dev --legacy-peer-deps

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/api ./dist/apps/api

# Seed db; entrypoint copies it onto the volume on first boot.
COPY db/database.db /app/seed/database.db
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV DATABASE_STORAGE=/app/db/database.db
EXPOSE 3333
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/apps/api/main.js"]
