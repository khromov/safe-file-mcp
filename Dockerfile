FROM node:22.12-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
COPY instructions.md ./
RUN npm run build

FROM node:22.12-alpine AS prod-deps

WORKDIR /deps

COPY package.json package-lock.json ./
RUN npm ci --production --ignore-scripts

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

ENV NODE_ENV=production

WORKDIR /app

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/opt/mcp-server/dist/index.js"]