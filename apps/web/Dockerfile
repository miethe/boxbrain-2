# syntax=docker/dockerfile:1

FROM node:22-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app
RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @boxbrain/web...

FROM deps AS builder

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
# The Next.js /api/* rewrite is baked into the standalone routes manifest at build time
# (output: "standalone" ignores runtime env for rewrites — only `next start` re-evaluates).
# The proxy runs server-side, so bake the in-network API host, not the browser-facing localhost.
# Default matches the compose service name; override with --build-arg for other topologies.
ARG BOXBRAIN_API_PROXY_TARGET=http://api:8000
ENV BOXBRAIN_API_PROXY_TARGET=$BOXBRAIN_API_PROXY_TARGET
ENV NODE_ENV=production

COPY . .
RUN pnpm --filter @boxbrain/web build

FROM node:22-slim AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
