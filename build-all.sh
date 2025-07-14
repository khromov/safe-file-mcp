#!/bin/sh

# Build script for Coco and Coco Mini

echo "🥥 Building Coco Docker images..."

# Build regular version
echo "\n📦 Building regular Coco image..."
docker build -t context-coder:latest -t context-coder:regular .

# Build mini version
echo "\n📦 Building Coco Mini image..."
docker build --build-arg BUILD_TYPE=mini -t context-coder:mini .

echo "\n✅ Build complete!"
echo "\nAvailable images:"
docker images | grep -E "^context-coder\s" | head -3

echo "\nTo run:"
echo "  Regular: docker run -it --rm -p 3001:3001 -v ./:/app -w /app context-coder:latest"
echo "  Mini:    docker run -it --rm -p 3001:3001 -v ./:/app -w /app context-coder:mini"
