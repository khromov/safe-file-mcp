#!/bin/sh

# Build script for Coco, Coco Mini, and Coco NoEdit

echo "🥥 Building Coco Docker images..."

# Build regular version
echo "\n📦 Building regular Coco image..."
docker build -t context-coder:latest -t context-coder:regular .

# Build mini version
echo "\n📦 Building Coco Mini image..."
docker build --build-arg BUILD_TYPE=mini -t context-coder:mini .

echo "\n📦 Building Coco NoEdit image..."
docker build --build-arg BUILD_TYPE=noedit -t context-coder:noedit .

echo "\n✅ Build complete!"
echo "\nAvailable images:"
docker images | grep -E "^context-coder\s" | head -4

echo "\nTo run:"
echo "  Regular: docker run -it --rm -p 3001:3001 -v ./:/app -w /app context-coder:latest"
echo "  Mini:    docker run -it --rm -p 3001:3001 -v ./:/app -w /app context-coder:mini"
echo "  NoEdit:  docker run -it --rm -p 3001:3001 -v ./:/app -w /app context-coder:noedit"

echo "\nVariant descriptions:"
echo "  Regular: Full mode with all tools including both edit_file (partial edits) and write_file (complete file rewrites)"
echo "  Mini:    Core analysis tools only (get_codebase_size, get_codebase, get_codebase_top_largest_files)"
echo "  NoEdit:  Full mode with edit_file disabled - only write_file (complete file rewrites) available"