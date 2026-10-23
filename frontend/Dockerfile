# ==============================================================================
# LastPlate Web Frontend Production Multi-Stage Dockerfile
# Builds optimized React + Vite + Tailwind bundle and serves via Nginx Alpine
# ==============================================================================

# ----------------- Stage 1: Build Web Bundle -----------------
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package manifests
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and configurations
COPY . .

# Build production SPA assets
RUN npm run build

# ----------------- Stage 2: Serve via Nginx Alpine -----------------
FROM nginx:1.25-alpine AS runner

# Remove default nginx HTML files
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
