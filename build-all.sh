#!/bin/sh

# Build script for Coco and Coco Mini

echo "🥥 Building Coco Docker images..."

# Build regular version
echo "\n📦 Building regular Coco image..."
docker build -t coco:latest -t coco:regular .

# Build mini version
echo "\n📦 Building Coco Mini image..."
docker build --build-arg BUILD_TYPE=mini -t coco:mini .

echo "\n✅ Build complete!"
echo "\nAvailable images:"
docker images | grep -E "^coco\s" | head -3

echo "\nTo run:"
echo "  Regular: docker run -it --rm -p 3001:3001 -v ./:/app -w /app coco:latest"
echo "  Mini:    docker run -it --rm -p 3001:3001 -v ./:/app -w /app coco:mini"
