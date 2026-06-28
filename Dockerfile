# syntax=docker/dockerfile:1
# Stage 1: build
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
COPY skills ./skills

RUN bun run build

# Stage 2: runtime — slim image with only the bundled artifacts
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Bun bundles all dependencies inline; no node_modules needed at runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/skills ./skills
COPY --from=builder /app/package.json ./package.json

# .vibe/ holds SQLite state and learnings — mount as a volume for persistence
RUN mkdir -p /app/.vibe /workspace

VOLUME ["/workspace", "/app/.vibe"]

WORKDIR /workspace

ENTRYPOINT ["bun", "run", "/app/dist/cli/index.js"]
CMD ["--help"]
