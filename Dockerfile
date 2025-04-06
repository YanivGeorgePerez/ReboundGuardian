# Use Bun's slim image to avoid installing dev tools
FROM oven/bun:1.0.21 as base

# Set working directory
WORKDIR /app

# Copy only the lockfile and package.json first for cache optimization
COPY bun.lockb package.json ./

# Install dependencies first (this step is cached unless bun.lockb changes)
RUN bun install --frozen-lockfile

# Now copy the rest of your app
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["bun", "run", "server.js"]
