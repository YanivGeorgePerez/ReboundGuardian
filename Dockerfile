# 🚀 Fast build Dockerfile
FROM oven/bun:latest
WORKDIR /app

# Only copy deps files first
COPY bun.lock package.json ./

# Install deps (cached if lockfile didn't change)
RUN bun install --frozen-lockfile

# Copy everything else (source code)
COPY . .

EXPOSE 3000
CMD ["bun", "server.js"]
