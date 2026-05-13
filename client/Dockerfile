# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY client/package*.json ./client/

# Install dependencies for the workspace
RUN npm install

# Copy source code
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/tsconfig.json
COPY client/src ./client/src
COPY client/index.html ./client/
COPY client/vite.config.ts ./client/
COPY client/tsconfig.json ./client/tsconfig.json

# Build the dependencies and then the client
RUN npm run build --workspace=@knowledge-tool/shared
RUN npm run build --workspace=@knowledge-tool/client

# Production stage
FROM nginx:alpine

# Copy built files from builder stage to Nginx's html directory
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy a custom nginx configuration if needed (for SPA routing)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
