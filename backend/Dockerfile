# syntax=docker/dockerfile:1
ARG NODE_VERSION=24-alpine

# ---------------------------------------------------------------------------
# deps: full node_modules (incl. dev deps), cached separately from source
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# "postinstall" (needs prisma/schema.prisma, not copied yet — the builder
# stage runs `prisma generate` itself once the full source is present) and
# "prepare" (husky — irrelevant, .dockerignore excludes .git) would fail
# with no dev deps / no schema at this point in the multi-stage build.
RUN npm pkg delete scripts.postinstall scripts.prepare && npm ci

# ---------------------------------------------------------------------------
# builder: compile TypeScript + generate the Prisma client
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prisma generate` only reads schema.prisma and emits code — it never
# connects — but prisma.config.ts eagerly resolves DATABASE_URL just to
# load, so a placeholder is enough at build time.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# migrate: one-off image for `prisma migrate deploy` in CI/CD (roadmap
# section 45) — never run automatically on container start, and never used
# for the running api/worker services.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# runtime: lean image with prod-only deps, shared by the api and worker
# services (docker-compose.prod.yml picks the entry point per service) —
# roadmap section 43: "não executar tudo dentro do mesmo container".
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json ./
# The generated Prisma client is already compiled into dist/ from the
# builder stage — drop "postinstall" (needs prisma/schema.prisma, not
# copied here) and "prepare" (husky — needs devDependencies we omit).
RUN npm pkg delete scripts.postinstall scripts.prepare \
  && npm ci --omit=dev \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER app
EXPOSE 3000

CMD ["node", "dist/main.js"]
