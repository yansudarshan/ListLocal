import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations';

declare global {
  // eslint-disable-next-line no-var
  var __listlocal_db: Database.Database | undefined;
}

function getDatabaseInstance(): Database.Database {
  if (global.__listlocal_db) {
    return global.__listlocal_db;
  }

  const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'listlocal.db');
  const db = new Database(dbPath);

  // WAL mode for optimal performance, foreign keys ON
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  if (process.env.NODE_ENV !== 'production') {
    global.__listlocal_db = db;
  }

  return db;
}

export const db = getDatabaseInstance();
export default db;
