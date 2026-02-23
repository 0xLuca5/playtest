#!/bin/sh

echo "🚀 Starting AI Run application..."
echo "📍 Current directory: $(pwd)"
echo "🗄️ Database provider: ${DB_PROVIDER:-sqlite}"

# 目录已在 entrypoint.sh 中创建，这里不需要重复

# 数据库初始化逻辑
if [ "$DB_PROVIDER" = "postgres" ]; then
  echo "🐘 Using PostgreSQL database"
  echo "🔗 Connection: $POSTGRES_URL"

  # 等待 PostgreSQL 就绪
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 15
  echo "✅ PostgreSQL should be ready"
  echo "📊 Database tables will be created automatically by PostgreSQL init scripts"

elif [ "$DB_PROVIDER" = "sqlite" ]; then
  echo "📁 Using SQLite database"
  DB_PATH=${SQLITE_PATH:-/app/data/sqlite.db}
  echo "🗄️ Database path: $DB_PATH"

  if [ ! -f "$DB_PATH" ]; then
    echo "📊 Database file not found, initializing..."
    if [ -f "/app/lib/db/init-db.js" ]; then
      node /app/lib/db/init-db.js
    else
      echo "⚠️ init-db.js not found, skipping database initialization"
    fi
  else
    echo "✅ Database file exists, skipping initialization"
  fi
else
  echo "⚠️ Unknown database provider: $DB_PROVIDER"
fi

echo "🌐 Starting server..."
exec node server.js
