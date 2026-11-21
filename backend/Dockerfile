# ==============================================================================
# StudyMate AI - Backend Production Dockerfile
# Multi-stage, secure non-root Node.js 20 LTS runtime
# ==============================================================================

# Stage 1: Production Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Apply system updates
RUN apk update && apk upgrade && apk add --no-cache libc6-compat

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Apply updates and install wget for container health checks
RUN apk update && apk upgrade && apk add --no-cache wget

# Set default production environment
ENV NODE_ENV=production \
    PORT=5000

# Create uploads directory and establish ownership for non-root user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Copy production dependencies from dependencies stage
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules

# Copy application source files
COPY --chown=node:node package.json ./
COPY --chown=node:node app.js server.js ./
COPY --chown=node:node config ./config
COPY --chown=node:node controllers ./controllers
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node models ./models
COPY --chown=node:node routes ./routes
COPY --chown=node:node services ./services
COPY --chown=node:node utils ./utils
COPY --chown=node:node scripts ./scripts

# Run as unprivileged node user
USER node

# Expose HTTP port
EXPOSE 5000

# Liveness probe health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/healthz/live || exit 1

# Direct process execution for signal propagation (SIGTERM/SIGINT)
CMD ["node", "server.js"]
