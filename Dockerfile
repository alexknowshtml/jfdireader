FROM docker.io/oven/bun:1 AS base
WORKDIR /app

# Install Node.js (needed for drizzle-kit migrations which use better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ nodejs npm && rm -rf /var/lib/apt/lists/*

# Install root dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Install client dependencies
COPY client/package.json client/bun.lock ./client/
RUN cd client && bun install --frozen-lockfile

# Copy source
COPY . .

# Build client
RUN cd client && bun run build

# Run migrations and start server
RUN mkdir -p data
EXPOSE 3100
CMD ["sh", "-c", "npx drizzle-kit migrate && bun run server/src/index.ts"]
