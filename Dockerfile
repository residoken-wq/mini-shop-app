FROM node:18-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps

RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./
COPY prisma ./prisma/

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
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM node:18-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install OpenSSL for Prisma (Bullseye has OpenSSL 1.1)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
RUN mkdir .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Install prisma globally or locally to ensure 'npx prisma' works without downloading
RUN npm install prisma @prisma/client

# Generate Prisma client for this specific platform
RUN npx prisma generate

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Ensure DB is synced. 
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
