# ==============================================================================
# SIPAT 2026 – ESCOLA SENAI "MORVAN FIGUEIREDO"
# Production Dockerfile (Otimizado para Railway + PostgreSQL + Prisma)
# ==============================================================================
FROM node:22-bookworm-slim AS builder

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY index.html tsconfig.json tsconfig.server.json vite.config.ts ./
COPY public ./public
COPY src ./src

RUN npm run build

# ==============================================================================
# Runtime Stage
# ==============================================================================
FROM node:22-bookworm-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Railway injeta dinamicamente a variável PORT em tempo de execução
EXPOSE 3000

CMD ["npm", "run", "start:prod"]

