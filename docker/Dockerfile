# OpenClaw Docker Image
# Multi-stage build for optimized production image
# Optimized for ARM64 (Graviton) architecture

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /deps

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy dependencies from deps stage
COPY --from=deps /deps/node_modules ./node_modules
COPY --from=deps /deps/package*.json ./

# Copy source code
COPY . .

# Build the application (if build script exists)
RUN if [ -f "package.json" ] && grep -q '"build"' package.json; then npm run build; fi

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install runtime dependencies including AWS CLI and curl
RUN apk add --no-cache \
    ca-certificates \
    curl \
    jq \
    git \
    openssh-client \
    bash \
    aws-cli \
    unzip

# Create non-root user
RUN addgroup -g 1000 -S openclaw && \
    adduser -u 1000 -S openclaw -G openclaw

# Set working directory
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /deps/node_modules ./node_modules
COPY --from=deps /deps/package*.json ./

# Copy built application from builder stage
COPY --from=builder /build/dist ./dist 2>/dev/null || true
COPY --from=builder /build/src ./src 2>/dev/null || true

# Copy default configs to /defaults/
RUN mkdir -p /defaults
COPY docker/config/openclaw.json /defaults/openclaw.json
COPY docker/config/SOUL.md /defaults/SOUL.md
COPY docker/config/USER.md /defaults/USER.md

# Create workspace directory structure
RUN mkdir -p /workspace/config /workspace/memory /workspace/logs && \
    chown -R openclaw:openclaw /workspace

# Copy and set up entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set proper ownership
RUN chown -R openclaw:openclaw /app

# Switch to non-root user
USER openclaw

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/workspace \
    CONFIG_DIR=/workspace/config \
    BEDROCK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0 \
    BEDROCK_REGION=us-east-1 \
    AWS_DEFAULT_REGION=us-east-1

# Expose port
EXPOSE 3000

# Health check on port 3000, path /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use entrypoint.sh as ENTRYPOINT
ENTRYPOINT ["/entrypoint.sh"]

# Default command
CMD ["node", "dist/index.js"]
