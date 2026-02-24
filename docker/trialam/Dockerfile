FROM node:23.7.0-alpine3.20 AS base

# 1. Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.

RUN apk add --no-cache gcompat
RUN apk add libressl-dev && cd /usr/lib && ln -s libssl.so libssl.so.1.1 && ln -s libcrypto.so libcrypto.so.1.1
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY next.config.ts ./
COPY prisma ./prisma/ 
RUN npm install -g pnpm
RUN pnpm install --force

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 2. Rebuild the source code only when needed
FROM base AS builder

RUN apk add --no-cache gcompat
RUN apk add libressl-dev && cd /usr/lib && ln -s libssl.so libssl.so.1.1 && ln -s libcrypto.so libcrypto.so.1.1
RUN apk add --no-cache openssl

ENV NEXT_PRIVATE_STANDALONE=true
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma/ 
COPY . .
# This will do the trick, use the corresponding env file for each environment.
COPY .env.trialam .env.production
RUN npm install -g pnpm
RUN pnpm prisma generate
ENV GENERATE_SOURCEMAP=false
RUN NODE_OPTIONS="--max-old-space-size=5120" pnpm build

# 3. Production image, copy all the files and run next
# FROM base AS runner
FROM base AS runner

RUN apk add --no-cache gcompat
RUN apk add libressl-dev && cd /usr/lib && ln -s libssl.so libssl.so.1.1 && ln -s libcrypto.so libcrypto.so.1.1
RUN apk add --no-cache openssl

WORKDIR /app
COPY --from=builder /app/next.config.ts ./
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static


USER nextjs

EXPOSE 3000

ENV PORT=3000

# CMD HOSTNAME=0.0.0.0 node server.js

# Simplified command that doesn't try to use HTTPS internally
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
