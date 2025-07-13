FROM node:18-alpine

# Install curl for health checks and jq for configuration parsing
RUN apk add --no-cache curl jq

# Set working directory
WORKDIR /app

# Install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code and TypeScript config
COPY src/ ./src/
COPY tsconfig.json ./
COPY read-config.js ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Create non-root user (use available IDs)
RUN addgroup -g 1001 mcpserver && \
    adduser -u 1001 -G mcpserver -s /bin/sh -D mcpserver

# Change ownership of app directory
RUN chown -R mcpserver:mcpserver /app

# Switch to non-root user
USER mcpserver

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
