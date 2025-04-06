# Use the latest official Bun image
FROM oven/bun:latest

WORKDIR /app

# Copy the actual lockfile and package.json
COPY bun.lock package.json ./

# Install deps using Bun
RUN bun install

# Copy rest of the files
COPY . .

EXPOSE 3000

CMD ["bun", "run", "server.js"]
