# ==============================================================================
# Multi-Stage Production Dockerfile for Project Rescue Foundation Web App
# Stage 1: Build the optimized React/Vite production distribution
# Stage 2: Serve via hardened, minimal Nginx Alpine image with reverse proxy
# ==============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies with frozen lockfile
RUN npm ci

# Copy source code and configuration
COPY . .

# Build production assets (Vite generates optimized dist/)
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom production Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security: run nginx as non-root user
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
