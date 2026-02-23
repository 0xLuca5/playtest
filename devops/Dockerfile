# 使用官方Node.js运行时作为基础镜像
FROM node:20-slim AS base

# Puppeteer Chromium 国内镜像加速
ENV PUPPETEER_DOWNLOAD_HOST=https://npmmirror.com/mirrors

# 安装 puppeteer 运行所需依赖
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 安装依赖项（包括 Python3、make、g++）
FROM base AS deps
WORKDIR /app
# 设置国内npm源
RUN npm config set registry https://registry.npmmirror.com/
# 只用npm安装依赖
COPY package.json package-lock.json* ./
RUN npm ci --verbose

# 重新构建源码
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
# PUPPETEER_DOWNLOAD_HOST 已在 base 阶段设置

# 构建应用
RUN npm run build

# 用 node 用户安装 puppeteer 的 chrome
USER node
RUN npx puppeteer browsers install chrome
USER root

# 生产镜像，复制所有文件并运行 next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# PUPPETEER_DOWNLOAD_HOST 已在 base 阶段设置

# 使用现有的 node 用户（UID 1000）
# node 用户已经在 node:20-slim 镜像中存在

COPY --from=builder /app/public ./public
COPY --from=builder /app/lib ./lib

# 设置正确的权限用于 prerender 缓存
RUN mkdir .next
RUN chown node:node .next

# 自动利用输出跟踪来复制必要的文件
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# node_modules 已经在 deps 阶段处理，这里不需要重复复制

# 复制 htmlElement.js 到 .next/dist/script
RUN mkdir -p .next/dist/script
COPY public/script/htmlElement.js .next/dist/script/htmlElement.js

# 创建数据目录并设置权限
RUN mkdir -p /app/data
RUN chown node:node /app/data
RUN chmod 775 /app/data

# 创建日志目录并设置权限
RUN mkdir -p /app/logs
RUN chown node:node /app/logs
RUN chmod 775 /app/logs

# 创建 cache 目录并授权给 node 用户
RUN mkdir -p /home/node/.cache/puppeteer && chown -R node:node /home/node/.cache

# 拷贝 puppeteer cache
COPY --from=builder /home/node/.cache/puppeteer /home/node/.cache/puppeteer

# 创建启动脚本和入口脚本（必须在 USER node 之前）
RUN echo '#!/bin/sh\n\
set -e\n\
echo "Starting AI Run application..."\n\
if [ ! -d "/app/data" ]; then\n\
    echo "Creating data directory..."\n\
    mkdir -p /app/data\n\
fi\n\
if [ ! -d "/app/logs" ]; then\n\
    echo "Creating logs directory..."\n\
    mkdir -p /app/logs\n\
fi\n\
if [ "$(id -u)" = "0" ]; then\n\
    echo "Setting directory permissions..."\n\
    chown -R node:node /app/data /app/logs\n\
    chmod -R 775 /app/data /app/logs\n\
fi\n\
echo "Entrypoint setup completed"\n\
exec "$@"' > /app/entrypoint.sh

RUN echo '#!/bin/sh\n\
echo "Starting AI Run application..."\n\
echo "Current directory: $(pwd)"\n\
echo "Database provider: ${DB_PROVIDER:-sqlite}"\n\
if [ "$DB_PROVIDER" = "postgres" ]; then\n\
  echo "Using PostgreSQL database"\n\
  echo "Connection: $POSTGRES_URL"\n\
  echo "Waiting for PostgreSQL to be ready..."\n\
  sleep 15\n\
  echo "PostgreSQL should be ready"\n\
  echo "Database tables will be created automatically by PostgreSQL init scripts"\n\
elif [ "$DB_PROVIDER" = "sqlite" ]; then\n\
  echo "Using SQLite database"\n\
  DB_PATH=${SQLITE_PATH:-/app/data/sqlite.db}\n\
  echo "Database path: $DB_PATH"\n\
  if [ ! -f "$DB_PATH" ]; then\n\
    echo "Database file not found, initializing..."\n\
    if [ -f "/app/lib/db/init-db.js" ]; then\n\
      node /app/lib/db/init-db.js\n\
    else\n\
      echo "Warning: init-db.js not found, skipping database initialization"\n\
    fi\n\
  else\n\
    echo "Database file exists, skipping initialization"\n\
  fi\n\
else\n\
  echo "Warning: Unknown database provider: $DB_PROVIDER"\n\
fi\n\
echo "Starting server..."\n\
exec node server.js' > /app/start.sh

RUN chmod +x /app/start.sh /app/entrypoint.sh

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 设置自定义入口点和启动命令
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["/app/start.sh"]