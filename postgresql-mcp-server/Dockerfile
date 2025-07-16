ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and npm on Home Assistant base image
RUN apk add --no-cache nodejs npm curl

# Set working directory
WORKDIR /app

# Install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code and TypeScript config
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Copy the run script and make it executable
COPY run.sh /
RUN chmod a+x /run.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start the server using the run script
CMD ["/run.sh"]
