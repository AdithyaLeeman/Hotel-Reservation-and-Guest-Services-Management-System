# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Dependencies (Node 22 LTS)
# =============================================================================
FROM node:22-bookworm AS deps
WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies with legacy peer deps for React 19 compatibility
RUN npm install --legacy-peer-deps --no-audit

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:22-bookworm AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build-time environment variables to ensure Next.js route collection succeeds
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hrgsms"
ENV SESSION_SECRET="dev_secret_replace_in_production_32+"

RUN npm run build

# =============================================================================
# Stage 3: Runner (Minimal production image)
# =============================================================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install tsx globally for database migrations & routine runners
RUN npm install -g tsx

# Create non-root system user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Copy standalone build & static files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy database schema, migrations, routines, and scripts
COPY --from=builder --chown=nextjs:nodejs /app/database ./database
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Copy and configure entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && \
    chmod +x ./docker-entrypoint.sh && \
    touch .env.local && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
