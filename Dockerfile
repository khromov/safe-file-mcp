# Build stage for regular and mini builds
FROM node:22.12-alpine AS builder

# Add build argument to determine build type
ARG BUILD_TYPE=regular

WORKDIR /build

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
COPY instructions.md ./

# Replace tools.ts with tools.mini.ts for mini build
RUN if [ "$BUILD_TYPE" = "mini" ]; then \
    mv ./src/tools.mini.ts ./src/tools.ts; \
  fi

RUN npm run build

# Production dependencies stage
FROM node:22.12-alpine AS prod-deps

WORKDIR /deps

COPY package.json package-lock.json ./
RUN npm ci --production --ignore-scripts

# Release stage - same for both regular and mini
FROM node:22-alpine AS release

LABEL org.opencontainers.image.title="🥥 Coco - Context Coder"
LABEL org.opencontainers.image.description="MCP server providing secure file system operations with relative path handling for AI context management"
LABEL org.opencontainers.image.vendor="Model Context Protocol"

RUN apk add --no-cache \
    tini \
    less \
    git \
    procps \
    sudo \
    fzf \
    zsh \
    man-db \
    unzip \
    gnupg \
    github-cli \
    bind-tools \
    jq \
    ncdu

WORKDIR /opt/mcp-server

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./
COPY --from=builder /build/instructions.md ./
COPY --from=prod-deps /deps/node_modules ./node_modules

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production

WORKDIR /app

# Use exec form to ensure signals are properly handled
ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
