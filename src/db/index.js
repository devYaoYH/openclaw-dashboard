const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/dashboard.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    is_private INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS current_work (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT DEFAULT (datetime('now')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'in_progress',
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS planned_work (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT (datetime('now')),
    title TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'planned'
  );

  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
  CREATE INDEX IF NOT EXISTS idx_current_work_status ON current_work(status);
`);

module.exports = {
  db,

  // Events - PUBLIC activities only (no private data)
  logEvent(category, title, description = null, metadata = null, isPrivate = false) {
    const stmt = db.prepare(`
      INSERT INTO events (category, title, description, metadata, is_private)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(category, title, description, JSON.stringify(metadata), isPrivate ? 1 : 0);
  },

  getRecentEvents(limit = 50) {
    // Only return non-private events
    return db.prepare(`
      SELECT id, timestamp, category, title, description, metadata
      FROM events
      WHERE is_private = 0
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);
  },

  // Current work tracking
  startWork(title, description = null) {
    const stmt = db.prepare(`
      INSERT INTO current_work (title, description)
      VALUES (?, ?)
    `);
    return stmt.run(title, description);
  },

  completeWork(id) {
    const stmt = db.prepare(`
      UPDATE current_work
      SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `);
    return stmt.run(id);
  },

  getCurrentWork() {
    return db.prepare(`
      SELECT id, started_at, title, description, status
      FROM current_work
      WHERE status = 'in_progress'
      ORDER BY started_at DESC
    `).all();
  },

  getCompletedWork(limit = 20) {
    return db.prepare(`
      SELECT id, started_at, completed_at, title, description
      FROM current_work
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT ?
    `).all(limit);
  },

  // Planned work
  addPlannedWork(title, description = null, priority = 0) {
    const stmt = db.prepare(`
      INSERT INTO planned_work (title, description, priority)
      VALUES (?, ?, ?)
    `);
    return stmt.run(title, description, priority);
  },

  getPlannedWork() {
    return db.prepare(`
      SELECT id, created_at, title, description, priority
      FROM planned_work
      WHERE status = 'planned'
      ORDER BY priority DESC, created_at ASC
    `).all();
  },

  markPlannedAsStarted(id) {
    const stmt = db.prepare(`
      UPDATE planned_work
      SET status = 'started'
      WHERE id = ?
    `);
    return stmt.run(id);
  }
};
