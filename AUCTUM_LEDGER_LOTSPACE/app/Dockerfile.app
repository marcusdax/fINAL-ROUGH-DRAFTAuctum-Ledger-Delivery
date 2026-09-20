# syntax=docker/dockerfile:1

# Auctum Ledger — frontend image
# Stage 1 (build): compile the React+Vite+TS app on Node 22.
# Stage 2 (prod):  serve the static bundle with nginx on port 80.
# Split locale files are committed under app/public/locales by the frontend
# pipeline, so no runtime locale processing is required here.

FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first for layer-cache reuse.
# npm ci is authoritative; fall back to npm install when no lockfile exists yet.
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Build the production bundle. Vite bakes these in at build time.
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_AI_PROXY_URL=http://localhost
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_AI_PROXY_URL=${VITE_AI_PROXY_URL}
RUN npm run build

FROM nginx:alpine AS prod
# SPA config: history fallback + /api/ reverse proxy to the api service.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
