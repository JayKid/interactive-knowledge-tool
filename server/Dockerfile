# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and base configs first for better caching
COPY package*.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package*.json ./server/

# Install dependencies for the workspace
RUN npm install

# Copy source code
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/tsconfig.json
COPY server/tsconfig.json ./server/
COPY server/src ./server/src

# Build the shared package first, then the server
RUN npm run build --workspace=@knowledge-tool/shared
RUN npm run build --workspace=@knowledge-tool/server

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/package*.json ./

# Copy necessary runtime files
COPY server/package.json ./server/
COPY server/src/config.ts ./server/src/config.ts

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]

