# =============================================================================
# apps/api — Fastify HTTP + WebSocket
# Multi-stage: deps → build → runner (non-root, healthcheck)
# =============================================================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /repo

# ---------- deps ------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile=false

# ---------- builder ---------------------------------------------------------
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/config packages/config
COPY packages/db packages/db
COPY apps/api apps/api
RUN pnpm --filter @eak/db exec prisma generate
RUN pnpm --filter @eak/api build

# ---------- runner ----------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init tini curl \
  && addgroup -S eak && adduser -S eak -G eak
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages ./packages

USER eak

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
