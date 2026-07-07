# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/webapp/Dockerfile .

FROM node:20-slim AS builder
ENV NX_DAEMON=false
WORKDIR /app

# API base URL baked into the bundle; defaults to the nginx /api proxy path.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/webapp/package.json apps/webapp/package.json
RUN npm ci --legacy-peer-deps

COPY . .
# Skip cache: the nx cache key does not include VITE_API_URL.
RUN npx nx build webapp --skip-nx-cache

FROM nginx:alpine AS runtime
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/webapp/dist /usr/share/nginx/html
EXPOSE 80
