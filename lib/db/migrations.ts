import Database from 'better-sqlite3';

export const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'listed', 'sold')),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    category TEXT,
    price_min REAL,
    price_max REAL,
    language TEXT DEFAULT 'English',
    model_used TEXT,
    voice_sources_json TEXT,
    edited INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS past_listings (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    embedding TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS style_profile (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    vendor TEXT NOT NULL,
    date TEXT NOT NULL,
    total REAL NOT NULL,
    currency TEXT NOT NULL,
    raw_json TEXT,
    image_path TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipt_items (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL,
    description TEXT NOT NULL,
    qty REAL NOT NULL,
    unit_price REAL NOT NULL,
    product_id TEXT NULL,
    is_overhead INTEGER DEFAULT 0,
    FOREIGN KEY(receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS glossary (
    id TEXT PRIMARY KEY,
    term TEXT NOT NULL,
    translation TEXT NOT NULL,
    language TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS arena_results (
    id TEXT PRIMARY KEY,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    winner TEXT NOT NULL,
    latency_a_ms REAL NOT NULL,
    latency_b_ms REAL NOT NULL,
    tps_a REAL NOT NULL,
    tps_b REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'done', 'failed')),
    progress INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS network_blocks (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
  `
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[];
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  MIGRATIONS.forEach((migrationSql, idx) => {
    const version = idx + 1;
    if (!appliedSet.has(version)) {
      const apply = db.transaction(() => {
        db.exec(migrationSql);
        db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
          version,
          new Date().toISOString()
        );
      });
      apply();
    }
  });

  // Seed default settings if missing
  const defaultSettings: Record<string, string> = {
    currency: 'USD',
    etsy_fee_pct: '6.5',
    ebay_fee_pct: '13.25',
    labor_rate_per_hour: '25',
    default_packaging_cost: '2.50',
    default_shipping_cost: '4.50',
  };

  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  for (const [key, val] of Object.entries(defaultSettings)) {
    if (!getSetting.get(key)) {
      insertSetting.run(key, val);
    }
  }
}
