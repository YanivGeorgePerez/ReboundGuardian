# Use the latest official Bun image
FROM oven/bun:latest

# Install any additional OS packages if needed
# RUN apt-get update && apt-get install -y ...

WORKDIR /app
COPY . .
# Install dependencies
RUN bun install

EXPOSE 3000
CMD ["bun", "run", "server.ts"]
