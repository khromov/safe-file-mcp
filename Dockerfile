FROM node:22.12-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY *.ts instructions.md ./

RUN npm install
RUN npm run build

FROM node:22-alpine AS release

# Install tini for proper signal handling
RUN apk add --no-cache tini

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

RUN npm ci --ignore-scripts --omit-dev

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]