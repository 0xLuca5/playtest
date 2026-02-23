import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
const path = require('path');

let db: any;

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/sqlite.db');


if (process.env.DB_PROVIDER === 'sqlite') {
  // SQLite
  const Database = require('better-sqlite3');
  const sqlite = new Database(dbPath);

  // 启用外键约束
  sqlite.pragma('foreign_keys = ON');
  console.log('SQLite外键约束已启用');

  db = drizzleSqlite(sqlite);
} else {
  // Postgres
  const postgres = require('postgres');
  const client = postgres(process.env.POSTGRES_URL!);
  db = drizzlePg(client);
}

export { db }; 