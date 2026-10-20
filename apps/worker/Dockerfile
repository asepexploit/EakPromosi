# =============================================================================
# apps/worker — BullMQ workers (Telegram, billing, reports, scheduler)
# =============================================================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/config packages/config
COPY packages/db packages/db
COPY apps/worker apps/worker
RUN pnpm --filter @eak/db exec prisma generate
RUN pnpm --filter @eak/worker build

FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init tini \
  && addgroup -S eak && adduser -S eak -G eak
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /repo/apps/worker/dist ./dist
COPY --from=builder /repo/apps/worker/package.json ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages ./packages

USER eak
ENTRYPOINT ["/sbin/tini", "--", "/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
