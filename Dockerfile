FROM node:22.12-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json tsconfig.json ./
COPY *.ts instructions.md ./

RUN npm install
RUN npm run build

FROM node:22-alpine AS release

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Install the application in /opt/mcp-server
WORKDIR /opt/mcp-server

COPY --from=builder /build/dist /opt/mcp-server/dist
COPY --from=builder /build/package.json /opt/mcp-server/package.json
COPY --from=builder /build/package-lock.json /opt/mcp-server/package-lock.json

ENV NODE_ENV=production

RUN npm ci --ignore-scripts --omit-dev

# Default working directory for file operations
WORKDIR /app

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/opt/mcp-server/dist/index.js"]