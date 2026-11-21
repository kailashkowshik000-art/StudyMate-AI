# ==============================================================================
# StudyMate AI - Frontend Production Dockerfile
# Multi-stage: Node.js 20 build stage -> Nginx 1.27 Alpine production runtime
# ==============================================================================

# Stage 1: Build React & Vite static assets
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies using package-lock
COPY package.json package-lock.json ./
RUN npm ci

# Configure API URL (defaults to /api behind reverse proxy)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copy source and compile production distribution
COPY . .
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:1.27-alpine AS runner

# Remove default static pages
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx SPA routing and reverse-proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
