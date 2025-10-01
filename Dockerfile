# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Copy demo HTML files to root
COPY *.html ./

# Install dev dependencies for building
RUN npm ci

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S conductor -u 1001

# Change ownership of app directory
RUN chown -R conductor:nodejs /app

# Switch to non-root user
USER conductor

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]