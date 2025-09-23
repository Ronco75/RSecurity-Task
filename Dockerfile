# Multi-stage Dockerfile for CVE Application
# Stage 1: Build frontend (React + Vite)
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend (TypeScript)
FROM node:18-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files and install dependencies
COPY backend/package*.json ./
RUN npm ci

# Copy backend source and build
COPY backend/ ./
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# Copy built backend files
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/package*.json ./

# Copy built frontend files to be served by backend
COPY --from=frontend-build /app/frontend/dist ./public

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create backend/data directory for SQLite database
RUN mkdir -p ./backend/data && chown -R appuser:nodejs ./backend/data

# Switch to non-root user
USER appuser

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]