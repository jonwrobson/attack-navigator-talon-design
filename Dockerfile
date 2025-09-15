# Build stage
FROM node:18-bullseye AS builder

WORKDIR /src

# Copy package files first for better caching
COPY nav-app/package*.json /src/nav-app/
# Also copy scripts needed by postinstall (runs during npm ci)
COPY nav-app/patch-webpack.js /src/nav-app/
WORKDIR /src/nav-app

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy application files
COPY nav-app/ /src/nav-app/
COPY layers/*.md /src/layers/
COPY *.md /src/

# Build the application
RUN npm run build

# Test stage
FROM node:18-bullseye AS test

WORKDIR /src/nav-app

# Update package lists and install Chrome for testing
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome binary path for Karma
ENV CHROME_BIN=/usr/bin/google-chrome
ENV RUNNING_IN_DOCKER=true

# Copy from builder
COPY --from=builder /src /src

# Create directories for test outputs
RUN mkdir -p coverage test-results

# Install Cypress dependencies if needed
RUN apt-get update && apt-get install -y \
    libgtk2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Ensure Cypress binary is installed in the image
RUN npx cypress install

# Run tests (commented out to avoid failing build, run via docker-compose instead)
# RUN npm run test:ci
# RUN npm run lint

# Production stage
FROM node:18-bullseye-slim AS production

WORKDIR /app

# Install curl for health checks and a lightweight static server
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
  && npm install -g serve@14

# Copy built application
COPY --from=builder /src/nav-app/dist /app/dist
COPY --from=builder /src/layers /app/layers
COPY --from=builder /src/*.md /app/

# Security: Create non-root user and set ownership
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 4200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4200/ || exit 1

# Serve the built app statically
CMD ["serve", "-s", "dist", "-l", "4200"]
