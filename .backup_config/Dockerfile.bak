# ---------------------------------------------------
# 1. Base Image: Thiết lập môi trường chung
# ---------------------------------------------------
FROM node:22-alpine AS base

# Cài đặt libc6-compat: Cần thiết cho các thư viện xử lý ảnh (Sharp) 
# hoặc các binary engines như Prisma trên nền tảng Alpine Linux
RUN apk add --no-cache libc6-compat

# ---------------------------------------------------
# 2. Dependencies: Cài đặt các gói thư viện
# ---------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy các file quản lý gói
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Copy thư mục prisma để tạo Prisma Client khi cài đặt
COPY prisma ./prisma

# Cài đặt dependencies dựa trên loại lockfile
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# ---------------------------------------------------
# 3. Builder: Build ứng dụng Next.js
# ---------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Quan trọng: Tạo Prisma Client trước khi build Next.js
# Để đảm bảo Type Safety và connect được DB
RUN npx prisma generate

# Tắt Next.js telemetry (thu thập dữ liệu ẩn danh) khi build
ENV NEXT_TELEMETRY_DISABLED 1

# Thực hiện build source code
RUN npm run build

# ---------------------------------------------------
# 4. Runner: Image Production (Siêu nhẹ)
# ---------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Tạo user non-root để tăng tính bảo mật
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy thư mục public (ảnh, icon...)
COPY --from=builder /app/public ./public

# Copy thư mục .next/standalone (Chế độ tối ưu dung lượng của Next.js)
# Lưu ý: Bạn CẦN bật output: 'standalone' trong next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Chuyển sang user non-root
USER nextjs

# Mở port
EXPOSE 3000
ENV PORT 3000
# Hostname 0.0.0.0 bắt buộc để Docker nhận request từ bên ngoài
ENV HOSTNAME "0.0.0.0"

# Chạy server
CMD ["node", "server.js"]