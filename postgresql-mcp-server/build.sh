#!/usr/bin/env bash

set -e

# Build arguments
BUILD_FROM="node:18-alpine"
BUILD_ARCH="amd64"

# Create build context
echo "Creating build context..."
mkdir -p /tmp/addon-build
cp -r . /tmp/addon-build/

# Build the addon
echo "Building addon..."
docker build \
  --build-arg BUILD_FROM="${BUILD_FROM}" \
  --build-arg BUILD_ARCH="${BUILD_ARCH}" \
  -t local/postgresql-mcp-server:latest \
  /tmp/addon-build/

# Clean up
rm -rf /tmp/addon-build

echo "Build completed!"
echo "To run the addon locally:"
echo "docker run -p 3000:3000 --env-file .env local/postgresql-mcp-server:latest"
