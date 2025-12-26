FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./
COPY prisma ./prisma/
# COPY package-lock.json* ./ 

# Force install to ignore local lockfile mismatches
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Run as root to avoid SQLite volume permission issues
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Install prisma globally or locally to ensure 'npx prisma' works without downloading
RUN npm install prisma @prisma/client

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Ensure DB is synced. 
CMD ["sh", "-c", "npx prisma db push && node server.js"]

