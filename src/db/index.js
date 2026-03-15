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

  CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    agent_id TEXT NOT NULL DEFAULT 'ethan',
    session_id TEXT,
    event_type TEXT NOT NULL,
    tool_name TEXT,
    input_summary TEXT,
    outcome TEXT,
    latency_ms INTEGER,
    tokens_used INTEGER,
    cost_estimate REAL,
    error_message TEXT,
    context TEXT,
    metadata TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
  CREATE INDEX IF NOT EXISTS idx_current_work_status ON current_work(status);
  CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_events(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_telemetry_agent ON telemetry_events(agent_id);
  CREATE INDEX IF NOT EXISTS idx_telemetry_tool ON telemetry_events(tool_name);
  CREATE INDEX IF NOT EXISTS idx_telemetry_outcome ON telemetry_events(outcome);
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
  },

  // Telemetry - AOS Phase 0
  logTelemetry({
    agent_id = 'ethan',
    session_id = null,
    event_type,
    tool_name = null,
    input_summary = null,
    outcome = null,
    latency_ms = null,
    tokens_used = null,
    cost_estimate = null,
    error_message = null,
    context = null,
    metadata = null
  }) {
    const stmt = db.prepare(`
      INSERT INTO telemetry_events (
        agent_id, session_id, event_type, tool_name,
        input_summary, outcome, latency_ms, tokens_used,
        cost_estimate, error_message, context, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      agent_id, session_id, event_type, tool_name,
      input_summary, outcome, latency_ms, tokens_used,
      cost_estimate, error_message,
      JSON.stringify(context), JSON.stringify(metadata)
    );
  },

  getTelemetryStats(agent_id = 'ethan', hours = 24) {
    // SQLite datetime format: 'YYYY-MM-DD HH:MM:SS'
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    
    // Success rate by tool
    const successRate = db.prepare(`
      SELECT 
        tool_name,
        COUNT(*) as total,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes,
        ROUND(100.0 * SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
      FROM telemetry_events
      WHERE agent_id = ? AND timestamp > ? AND tool_name IS NOT NULL
      GROUP BY tool_name
      ORDER BY total DESC
    `).all(agent_id, since);

    // Cost breakdown
    const costs = db.prepare(`
      SELECT
        tool_name,
        COUNT(*) as calls,
        SUM(cost_estimate) as total_cost,
        AVG(cost_estimate) as avg_cost
      FROM telemetry_events
      WHERE agent_id = ? AND timestamp > ? AND cost_estimate IS NOT NULL
      GROUP BY tool_name
      ORDER BY total_cost DESC
    `).all(agent_id, since);

    // Latency stats
    const latency = db.prepare(`
      SELECT
        tool_name,
        AVG(latency_ms) as avg_ms,
        MIN(latency_ms) as min_ms,
        MAX(latency_ms) as max_ms
      FROM telemetry_events
      WHERE agent_id = ? AND timestamp > ? AND latency_ms IS NOT NULL
      GROUP BY tool_name
    `).all(agent_id, since);

    // Recent errors
    const errors = db.prepare(`
      SELECT timestamp, tool_name, error_message, context
      FROM telemetry_events
      WHERE agent_id = ? AND timestamp > ? AND outcome = 'failure'
      ORDER BY timestamp DESC
      LIMIT 20
    `).all(agent_id, since);

    return { successRate, costs, latency, errors };
  },

  getRecentTelemetry(agent_id = 'ethan', limit = 50) {
    return db.prepare(`
      SELECT 
        id, timestamp, event_type, tool_name, outcome,
        latency_ms, cost_estimate, input_summary, error_message
      FROM telemetry_events
      WHERE agent_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(agent_id, limit);
  }
};
