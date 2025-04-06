# Use official Bun base image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Only copy files that are needed to install deps first (for caching)
COPY bun.lock bun.lock
COPY package.json package.json

# Install dependencies (cached if package.json and lock didn't change)
RUN bun install --frozen-lockfile

# Copy all source files (after deps)
COPY . .

# Expose port for server
EXPOSE 3000

# Use native Bun command to run the app
CMD ["bun", "server.js"]
