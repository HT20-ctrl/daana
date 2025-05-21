FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies for production only
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Setup development dependencies
FROM base AS dev-deps
COPY package.json package-lock.json ./
RUN npm ci

# Build application
FROM dev-deps AS builder
COPY . .
RUN npm run build

# Final production image
FROM base AS runner
ENV NODE_ENV=production

# Create app user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 danaai

# Set proper permissions
COPY --from=builder --chown=danaai:nodejs /app/dist ./dist
COPY --from=deps --chown=danaai:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=danaai:nodejs /app/server ./server
COPY --from=builder --chown=danaai:nodejs /app/shared ./shared
COPY --from=builder --chown=danaai:nodejs /app/package.json ./package.json

# Switch to non-root user
USER danaai

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 3000, path: '/api/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => { process.exit(1); }); req.end();"

# Expose the server port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/index.js"]