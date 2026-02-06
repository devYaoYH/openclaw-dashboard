const express = require('express');
const db = require('../db');
const activityRoutes = require('./activity');
const config = require('../config');

const router = express.Router();

// Mount activity routes
router.use('/activity', activityRoutes);

// GET /api/status - Overall status summary
router.get('/status', (req, res) => {
  const currentWork = db.getCurrentWork();
  const plannedWork = db.getPlannedWork();
  const recentEvents = db.getRecentEvents(30);
  
  res.json({
    name: config.agent.name,
    role: config.agent.role,
    status: currentWork.length > 0 ? 'working' : 'idle',
    currentWork,
    plannedWork: plannedWork.slice(0, 5),
    recentActivity: recentEvents
  });
});

// GET /api/events - Recent activity log
router.get('/events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const events = db.getRecentEvents(limit);
  res.json(events);
});

// GET /api/work/current - What I'm working on now
router.get('/work/current', (req, res) => {
  res.json(db.getCurrentWork());
});

// GET /api/work/completed - Recently completed work
router.get('/work/completed', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  res.json(db.getCompletedWork(limit));
});

// GET /api/work/planned - What's coming up
router.get('/work/planned', (req, res) => {
  res.json(db.getPlannedWork());
});

module.exports = router;
