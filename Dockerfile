FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npx tsc

# Create non-root user
RUN addgroup -g 1000 mcpserver && \
    adduser -u 1000 -G mcpserver -s /bin/sh -D mcpserver

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
