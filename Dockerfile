FROM node:18-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps

RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies using clean install for speed and consistency
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED 1

# Set a dummy DATABASE_URL for build time (required for Prisma during Next.js build)
# The actual DATABASE_URL will be provided at runtime
ENV DATABASE_URL "file:./build-placeholder.db"

RUN npm run build

# Production image, copy all the files and run next
FROM node:18-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install OpenSSL for Prisma (Bullseye has OpenSSL 1.1)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install prisma globally to cache this layer
RUN npm install -g prisma@5.22.0

COPY --from=builder /app/public ./public
RUN mkdir .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma



# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Ensure DB is synced. 
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
