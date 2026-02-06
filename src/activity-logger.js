/**
 * Activity Logger - Logs Ethan's real-time activities to the dashboard
 * Integrates with agtrace, Claude monitor, and moltbook tracking
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../db/dashboard.db');
const db = new Database(DB_PATH);

class ActivityLogger {
  constructor() {
    this.ensureTable();
  }

  ensureTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'in-progress',
        duration_seconds INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
      CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
    `);
  }

  log(category, title, description = null, metadata = {}) {
    const stmt = db.prepare(`
      INSERT INTO activities (category, title, description, metadata)
      VALUES (?, ?, ?, ?)
    `);
    
    return stmt.run(
      category,
      title,
      description,
      JSON.stringify(metadata)
    );
  }

  startTask(title, description = null, category = 'task') {
    const stmt = db.prepare(`
      INSERT INTO activities (category, title, description, status)
      VALUES (?, ?, ?, 'in-progress')
    `);
    
    const result = stmt.run(category, title, description);
    return result.lastInsertRowid;
  }

  completeTask(taskId, durationSeconds = null, metadata = {}) {
    const stmt = db.prepare(`
      UPDATE activities 
      SET status = 'completed', duration_seconds = ?, metadata = ?
      WHERE id = ?
    `);
    
    stmt.run(durationSeconds, JSON.stringify(metadata), taskId);
  }

  getCurrentActivity() {
    const stmt = db.prepare(`
      SELECT * FROM activities 
      WHERE status = 'in-progress'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    return stmt.get();
  }

  getRecentActivities(limit = 20) {
    const stmt = db.prepare(`
      SELECT * FROM activities 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit);
  }

  getActivityStats() {
    const result = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE NULL END) as avg_duration
      FROM activities
    `).get();
    
    return result;
  }
}

module.exports = ActivityLogger;
