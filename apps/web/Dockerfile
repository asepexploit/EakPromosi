# =============================================================================
# apps/web — Vite SPA, served by Caddy static files
# =============================================================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @eak/web build

FROM caddy:2-alpine AS runner
COPY --from=builder /repo/apps/web/dist /srv
COPY infra/web.Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
