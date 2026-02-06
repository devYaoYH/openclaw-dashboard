/**
 * Activity Stream Routes
 * Shows Ethan's real-time activities, current work, and recent actions
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const DB_PATH = path.join(__dirname, '../../data/dashboard.db');
const db = new Database(DB_PATH);

/**
 * GET /api/activity/current
 * What I'm working on right now
 */
router.get('/current', (req, res) => {
  const stmt = db.prepare(`
    SELECT * FROM activities 
    WHERE status = 'in-progress'
    ORDER BY created_at DESC
    LIMIT 1
  `);
  
  const current = stmt.get();
  res.json({
    current: current || null,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/activity/stream
 * Recent activity stream
 */
router.get('/stream', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const category = req.query.category;
  
  let query = `
    SELECT * FROM activities 
    WHERE 1=1
  `;
  const params = [];
  
  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  
  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const stmt = db.prepare(query);
  const activities = stmt.all(...params);
  
  res.json({
    activities,
    total: activities.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/activity/stats
 * Activity statistics
 */
router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
      COUNT(DISTINCT category) as category_count,
      AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE NULL END) as avg_duration_seconds
    FROM activities
  `).get();
  
  const today = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE DATE(created_at) = DATE('now')
  `).get();
  
  res.json({
    allTime: stats,
    today: today,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/activity/categories
 * Breakdown by category
 */
router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT 
      category,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE 0 END) as total_duration
    FROM activities
    GROUP BY category
    ORDER BY count DESC
  `).all();
  
  res.json({
    categories,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/activity/log
 * Log a new activity
 */
router.post('/log', express.json(), (req, res) => {
  const { category, title, description, metadata } = req.body;
  
  if (!category || !title) {
    return res.status(400).json({
      error: 'Missing required fields: category, title'
    });
  }
  
  const stmt = db.prepare(`
    INSERT INTO activities (category, title, description, metadata)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    category,
    title,
    description || null,
    JSON.stringify(metadata || {})
  );
  
  res.json({
    success: true,
    id: result.lastInsertRowid,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/activity/start
 * Start a new in-progress task
 */
router.post('/start', express.json(), (req, res) => {
  const { category, title, description, metadata } = req.body;
  
  if (!category || !title) {
    return res.status(400).json({
      error: 'Missing required fields: category, title'
    });
  }
  
  const stmt = db.prepare(`
    INSERT INTO activities (category, title, description, status, metadata)
    VALUES (?, ?, ?, 'in-progress', ?)
  `);
  
  const result = stmt.run(
    category,
    title,
    description || null,
    JSON.stringify(metadata || {})
  );
  
  res.json({
    success: true,
    id: result.lastInsertRowid,
    status: 'in-progress',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/activity/complete/:id
 * Mark a task as complete
 */
router.post('/complete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  // Get the activity to calculate duration
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }
  
  const startTime = new Date(activity.created_at).getTime();
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  db.prepare(`
    UPDATE activities 
    SET status = 'completed', duration_seconds = ?
    WHERE id = ?
  `).run(duration, id);
  
  res.json({
    success: true,
    id,
    duration_seconds: duration,
    timestamp: new Date().toISOString()
  });
});

/**
 * DELETE /api/activity/:id
 * Delete an activity
 */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const result = db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  
  res.json({
    success: result.changes > 0,
    deleted: result.changes
  });
});

module.exports = router;
